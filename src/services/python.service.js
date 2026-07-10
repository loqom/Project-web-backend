const axios = require("axios")
const startPipeline = async(sessionId,input)=>{
    try{
        const {techStack, skillLevel, timeAvailable, goal} = input;
        const response=axios.post(`${process.env.PYTHON_SERVICE_URL}/pipeline/run`,{
            sessionId, techStack, skillLevel, timeAvailable, goal
        });
        return response.data;
    }
    catch(err){
        throw err;
    }
}

module.exports={startPipeline,};

// 1. import axios → npm install axios
// 2. export a function → startPipeline(sessionId, input)
// 3. it POSTs to http://localhost:8000/pipeline/run
// 4. sends { sessionId, techStack, skillLevel, timeAvailable, goal }
// 5. returns the response