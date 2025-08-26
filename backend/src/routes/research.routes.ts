import express from 'express';

const researchRouter = express.Router();

researchRouter.post('/initialize', (req, res) => {
    const { query } = req.body; 

    // TODO: implement your logic here
    console.log("Received query:", query);

    res.json({
        success: true,
        message: "Research initialized",
        data: { query }
    });
});

export default researchRouter;
