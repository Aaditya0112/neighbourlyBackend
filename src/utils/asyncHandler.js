const asyncHandler = (requestHandler) => {
    return async (req, reply) => {
        try {
            await requestHandler(req, reply);
        } catch (error) {
            reply.send(error); // Send error response
        }
    };
};

export  {asyncHandler};
