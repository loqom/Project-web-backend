// etAllProjects
// 1. find all projects where userId = req.user._id and isSaved = true
// 2. return { success: true, data: projects }

const Project = require("../models/projects")

const getAllProjects=async(req,res)=>{
    try{
        const projects=await Project.find({
            userId:req.user._id,
            isSaved:true
        });
        return res.status(200).json({success:true,data:projects});
    }catch(err){
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
        const {projectId}=req.body;
        const proj=await Project.findById(projectId);
        if (!proj) return res.status(404).json({ success: false, message: "Project not found" })
        proj.isSaved=true;
        await proj.save();
        return res.status(200).json({success:true,data:proj});
    }catch(err){
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