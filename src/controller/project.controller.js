// etAllProjects
// 1. find all projects where userId = req.user._id and isSaved = true
// 2. return { success: true, data: projects }

const Project = require("../models/projects")
const Problem = require("../models/problem")

const getAllProjects=async(req,res)=>{
    try{
        console.log('[getAllProjects] User:', req.user?._id);
        console.log('[getAllProjects] User ID type:', typeof req.user?._id);
        const projects=await Project.find({
            userId:req.user._id,
            isSaved:true
        });
        console.log('[getAllProjects] Found:', projects.length, 'projects');
        console.log('[getAllProjects] Projects:', projects.map(p => ({id: p._id, title: p.title, userId: p.userId, isSaved: p.isSaved})));
        const response = {success:true,data:projects};
        console.log('[getAllProjects] Sending response:', JSON.stringify(response).slice(0, 500));
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        return res.status(200).json(response);
    }catch(err){
        console.error('[getAllProjects] Error:', err);
        res.status(500).json({ success: false, message: err.message })
    }
}

// getProjectById
// 1. get id from req.params
// 2. find project by id
// 3. check project.userId matches req.user._id → else 403
// 4. return { success: true, data: project }

const getProjectById=async(req,res)=>{
    try{
        const {id}=req.params;
        const project=await Project.findById(id);
        if (!project) return res.status(404).json({ success: false, message: "Project not found" });
        if (project.userId.toString() !== req.user._id.toString()) 
            return res.status(403).json({ success: false, message: "Unauthorized" });
        return res.status(200).json({success:true,data:project});
    }catch(err){
        res.status(500).json({ success: false, message: err.message })
    }
}


// 1. get projectId from req.body
// 2. find project by id
// 3. set isSaved = true → project.save()
// 4. return { success: true, data: project }

const saveProject=async(req,res)=>{
    try{
        console.log('[saveProject] Request body:', req.body);
        console.log('[saveProject] User:', req.user?._id);
        const {projectId}=req.body;
        
        // First try to find in Project collection
        let proj = await Project.findById(projectId);
        
        if (!proj) {
            // If not found, try Problem collection (for Explore section saves)
            const problem = await Problem.findById(projectId);
            console.log('[saveProject] Found problem:', problem ? {id: problem._id, title: problem.title} : 'NOT FOUND');
            
            if (problem) {
                // Check if user already has this problem saved as a project
                const existing = await Project.findOne({ 
                    userId: req.user._id, 
                    title: problem.title,
                    sessionId: { $exists: false } // Community-saved projects don't have sessionId
                });
                
                if (existing) {
                    // Toggle existing
                    existing.isSaved = !existing.isSaved;
                    await existing.save();
                    console.log('[saveProject] Toggled existing project isSaved to:', existing.isSaved);
                    return res.status(200).json({success:true,data:existing});
                }
                
                // Create new Project from Problem
                proj = new Project({
                    userId: req.user._id,
                    title: problem.title,
                    oneLiner: problem.summary,
                    problemStatement: problem.description,
                    proposedSolution: problem.summary,
                    techStack: problem.techStack || [],
                    matchScore: problem.impactScore || 0,
                    complexity: problem.difficulty === 'Beginner' ? 'easy' : problem.difficulty === 'Intermediate' ? 'medium' : 'hard',
                    estimatedTime: '4 weeks',
                    features: {
                        mvp: problem.mvpRequirements || [],
                        stretch: problem.stretchGoals || []
                    },
                    roadmap: problem.roadmapWeeks?.map((r, idx) => ({
                        week: r.week || idx + 1,
                        title: r.title || `Week ${r.week || idx + 1}`,
                        tasks: r.tasks || []
                    })) || [],
                    isSaved: true,
                    sessionId: null // Mark as community-saved
                });
                await proj.save();
                console.log('[saveProject] Created new project from problem:', proj._id);
                return res.status(200).json({success:true,data:proj});
            }
        }
        
        console.log('[saveProject] Found project:', proj ? {id: proj._id, userId: proj.userId, isSaved: proj.isSaved} : 'NOT FOUND');
        if (!proj) return res.status(404).json({ success: false, message: "Project not found" })
        if (proj.userId.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, message: "Unauthorized" });
        proj.isSaved = !proj.isSaved;
        await proj.save();
        console.log('[saveProject] Toggled isSaved to:', proj.isSaved);
        return res.status(200).json({success:true,data:proj});
    }catch(err){
        console.error('[saveProject] Error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// deleteProject
// 1. get id from req.params
// 2. find project by id
// 3. check ownership → else 403
// 4. delete → Project.findByIdAndDelete(id)
// 5. return { success: true, message: "Project deleted" }

const deleteProject=async(req,res)=>{
    try{
        const {id}=req.params;
        const proj=await Project.findById(id);
        if (!proj) return res.status(404).json({ success: false, message: "Project not found" })
        if (proj.userId.toString() !== req.user._id.toString())
            return res.status(403).json({ success: false, message: "Unauthorized" }); 
        await Project.findByIdAndDelete(id);
        return res.status(200).json({success:true,data:proj});
    }catch(err){
        res.status(500).json({ success: false, message: err.message });        
    }
};

module.exports={getAllProjects,getProjectById,deleteProject,saveProject};