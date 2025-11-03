// creating standardised format for api errors

class ApiError extends Error{
    constructor(
        statusCode,
        message = "something went wrong",
        error = [],
        stack = ""
    ){ // overiding

        super(message)
        this.statusCode = statusCode
        this.data = null // #TODO
        this.message = message
        this.success = false;
        this.errors = error

        if(stack){
            this.stack = stack
        } else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}