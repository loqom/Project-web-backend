const {startPipeline:callPythonPipeline }=require("./python.service");
const Session=require("../models/session");
const Project=require("../models/projects");

const sseClients={};
// Buffer for callbacks received before the SSE client connects
const pendingCallbacks={};

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

//function 2

// 1. get sessionId from req.params
// 2. check session exists in DB → if not return 404
// 3. set SSE headers:
//    - Content-Type: text/event-stream
//    - Cache-Control: no-cache
//    - Connection: keep-alive
// 4. store connection → sseClients[sessionId] = res
// 5. send initial event → { message: 'connected', sessionId }
// 6. handle client disconnect:
//    req.on('close', () => delete sseClients[sessionId])

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
                    res.write(`data:${JSON.stringify(entry.payload)}\n\n`);
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

// function 3 -handle callback

// 1. Get sessionId from req.params

// 2. Destructure from req.body:
//    agentName, status, message, output, isComplete, projects

// 3. Build agentLog entry:
//    {
//      agentName,
//      status,
//      message,
//      output,
//      finishedAt: new Date()
//    }

// 4. Push agentLog to Session in MongoDB:
//    Session.findByIdAndUpdate(sessionId, {
//      $push: { agentLogs: agentLog }
//    })

// 5. Check if SSE connection exists:
//    if(sseClients[sessionId])
//      push update to frontend:
//      sseClients[sessionId].write(`data: ${JSON.stringify(agentLog)}\n\n`)

// 6. If isComplete === true:
//    a. loop through projects array
//    b. create Project document for each:
//       { ...project, sessionId, userId: session.userId }
//    c. collect their _ids
//    d. update Session:
//       - push all project _ids into results[]
//       - set status: 'completed'
//    e. push final SSE event:
//       { status: 'completed', message: 'Pipeline finished' }
//    f. close SSE connection:
//       sseClients[sessionId].end()
//    g. delete sseClients[sessionId]

// 7. return { success: true }

const handleCallback=async(req,res)=>{
    try{
        const {sessionId}=req.params; 
        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, message: "Session not found" });
        const {agentName, status, message, output, isComplete, projects} = req.body;
        console.log(`\n=== CALLBACK RECEIVED ===`);
        console.log(`Session: ${sessionId}`);
        console.log(`Agent: ${agentName}`);
        console.log(`Status: ${status}`);
        console.log(`Message: ${message}`);
        console.log(`isComplete: ${isComplete}`);
        console.log(`SSE client exists: ${!!sseClients[sessionId]}`);
        if (projects) console.log(`Projects count: ${projects.length}`);
        console.log(`=========================\n`);

        const agentLog={
            agentName, status, message, output, finishedAt:Date.now()
        }
        await Session.findByIdAndUpdate(sessionId, {$push: { agentLogs: agentLog }})
        if(sseClients[sessionId]){
            sseClients[sessionId].write(`data:${JSON.stringify(agentLog)}\n\n`);
        } else {
            if(!pendingCallbacks[sessionId]) pendingCallbacks[sessionId]=[];
            pendingCallbacks[sessionId].push({type:'log',payload:agentLog});
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
                pendingCallbacks[sessionId].push({ type: 'completed', payload: completedPayload });
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


const getPipelineResult=async(req,res)=>{
    try{
        const {sessionId}=req.params;
        const session=await Session.findById(sessionId).populate('results');;
        if(!session) return res.status(404).json({success:false,message:"session not found"});
        if(session.status!=='completed') return res.status(404).json({success:false,message:"pipeline not complete yet"});
        return res.status(200).json({success:true,data:session.results});
    }catch(err){
        res.status(404).json({success:false,message:err.message});
    }
};

module.exports = {
  startPipeline,
  streamPipeline,
  handleCallback,
  getPipelineStatus,
  getPipelineResult
};