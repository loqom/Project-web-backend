const {startPipeline:callPythonPipeline }=require("../services/python.service");
const Session=require("../models/session");
const Project=require("../models/projects");
const Problem=require("../models/problem");

const sseClients={};
// Buffer for callbacks received before the SSE client connects
const pendingCallbacks={};

// Clean up stale pending callbacks after 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const sessionId of Object.keys(pendingCallbacks)) {
        const entries = pendingCallbacks[sessionId];
        if (entries.length > 0 && entries[0]._timestamp && now - entries[0]._timestamp > 600000) {
            delete pendingCallbacks[sessionId];
        }
    }
}, 60000);

const startPipeline=async(req,res)=>{
    try{
        const {techStack, skillLevel, timeAvailable, goal} = req.body;
        const session=new Session({
            userId:req.user._id,
            status:'pending',
            input:{techStack, skillLevel, timeAvailable, goal},
        });
        const saveSession=await session.save();
        callPythonPipeline (saveSession._id, {
            techStack,
            skillLevel,
            timeAvailable,
            goal
        });
        return res.status(201).json({ success: true, sessionId: saveSession._id });
    }
    catch(err){
        res.status(500).json({ success: false, message: err.message });
    }
};

const streamPipeline=async(req,res)=>{
    try{
        const {sessionId}=req.params;
        const session=await Session.findById(sessionId);
        if(!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }
        res.setHeader("Content-Type","text/event-stream");
        res.setHeader("Cache-Control","no-cache");
        res.setHeader("Connection","keep-alive");
        sseClients[sessionId] = res;
        // Send initial connected event
        res.write(`data: ${JSON.stringify({ message: "connected", sessionId })}\n\n`);
        // Flush any buffered callbacks that arrived earlier
        if(pendingCallbacks[sessionId]){
            pendingCallbacks[sessionId].forEach(entry => {
                if(entry.type==='log'){
                    res.write(`data: ${JSON.stringify(entry.payload)}\n\n`);
                } else if(entry.type==='completed'){
                    res.write(`data: ${JSON.stringify(entry.payload)}\n\n`);
                    // close after sending completed event
                    res.end();
                }
            });
            delete pendingCallbacks[sessionId];
        }
        req.on("close", () => {
            delete sseClients[sessionId];
        });
    }catch(err){
        res.status(500).json(err);
    }
}

const handleCallback=async(req,res)=>{
    try{
        const expectedKey = process.env.INTERNAL_API_KEY || "buildpath-internal-key-2026";
        const apiKey = req.headers['x-internal-api-key'];
        if (expectedKey && apiKey !== expectedKey) {
            console.warn(`[handleCallback] Unauthorized callback attempt. Expected: ${expectedKey}, Got: ${apiKey}`);
            return res.status(401).json({ success: false, message: "Unauthorized callback" });
        }
        const {sessionId}=req.params; 
        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: "Session not found" });
        const {agentName, status, message, output, isComplete, projects} = req.body;
        const agentLog={
            agentName, status, message, output, finishedAt:Date.now()
        }
        await Session.findByIdAndUpdate(sessionId, {$push: { agentLogs: agentLog }})
        if(sseClients[sessionId]){
            sseClients[sessionId].write(`data: ${JSON.stringify(agentLog)}\n\n`);
        } else {
            if(!pendingCallbacks[sessionId]) pendingCallbacks[sessionId]=[];
            pendingCallbacks[sessionId].push({type:'log', payload:agentLog, _timestamp: Date.now()});
        }
        const result=[];
        if ( isComplete == true){
            for (const proj of projects) {
                const project = new Project({
                    ...proj,
                    sessionId,
                    userId: session.userId,
                });
                const saved=await project.save();
                result.push(project._id);

                const problem = new Problem({
                    title: proj.title,
                    sector: proj.sector || "DevTools",
                    difficulty: proj.complexity === "easy" ? "Beginner" : proj.complexity === "medium" ? "Intermediate" : "Advanced",
                    description: proj.problemStatement,
                    summary: proj.proposedSolution?.slice(0, 200) || "",
                    techStack: proj.techStack || [],
                    mvpRequirements: proj.features?.mvp || [],
                    stretchGoals: proj.features?.stretch || [],
                    roadmapWeeks: proj.roadmap?.map((r) => ({
                        week: r.week,
                        title: r.title,
                        description: r.tasks.join(", "),
                        tasks: r.tasks,
                    })) || [],
                    impactScore: proj.matchScore || 0,
                    verified: true,
                    isCommunitySubmission: false,
                });
                await problem.save();
            }
            await Session.findByIdAndUpdate(sessionId, {
                $push: { results: { $each: result } },
                $set:{status: 'completed'}
            });
            const completedPayload = { status: "completed", message: "Pipeline finished", sessionId };
            if (sseClients[sessionId]) {
                sseClients[sessionId].write(`data: ${JSON.stringify(completedPayload)}\n\n`);
                sseClients[sessionId].end();
                delete sseClients[sessionId];
            } else {
                if (!pendingCallbacks[sessionId]) pendingCallbacks[sessionId] = [];
                pendingCallbacks[sessionId].push({ type: 'completed', payload: completedPayload, _timestamp: Date.now() });
            }
        }

        if (status === 'failed') {
            await Session.findByIdAndUpdate(sessionId, { $set: { status: 'failed' } });
            const failedPayload = { status: "failed", message: message || "Pipeline failed", sessionId };
            if (sseClients[sessionId]) {
                sseClients[sessionId].write(`data: ${JSON.stringify(failedPayload)}\n\n`);
                sseClients[sessionId].end();
                delete sseClients[sessionId];
            } else {
                if (!pendingCallbacks[sessionId]) pendingCallbacks[sessionId] = [];
                pendingCallbacks[sessionId].push({ type: 'completed', payload: failedPayload, _timestamp: Date.now() });
            }
        }
        
        return res.status(200).json({success:true});
    }catch(err){
        res.status(500).json({ success: false, message: err.message })
    }
}


// function 4- pipeline status
// 1. get sessionId from req.params
// 2. find Session by id
// 3. if not found → 404
// 4. return { success: true, data: session }

const getPipelineStatus=async(req,res)=>{
    try{
        const {sessionId}=req.params;
        const session=await Session.findById(sessionId);
        if(!session) return res.status(404).json({success:false,message:"session not found"});
        return res.status(200).json({success:true,data:session});
    }catch(err){
        res.status(404).json({success:false,message:err.message});
    }
};

// function 5 - getpipelineresult
// 1. get sessionId from req.params
// 2. find Session by id → .populate('results')
// 3. if not found → 404
// 4. if session.status !== 'completed' → 400 'Pipeline not complete yet'
// 5. return { success: true, data: session.results }


const getPipelineResult = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await Session.findById(sessionId).populate('results');
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        let projects = session.results || [];
        if (!projects.length) {
            projects = await Project.find({ sessionId });
        }

        if (projects.length > 0) {
            return res.status(200).json({ success: true, data: projects });
        }

        if (session.status !== 'completed') {
            return res.status(400).json({ success: false, message: "Pipeline not complete yet" });
        }

        return res.status(200).json({ success: true, data: [] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
  startPipeline,
  streamPipeline,
  handleCallback,
  getPipelineStatus,
  getPipelineResult
};