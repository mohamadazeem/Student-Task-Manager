const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599
        ? err.status : 500;
    // Never log request bodies, database errors, or connection strings.
    const message = err.type === "entity.parse.failed" ? "Invalid JSON body"
        : status === 413 ? "Request body too large"
        : status >= 500 ? "Internal server error" : "Invalid request";
    res.status(status).json({ error: message });
};
module.exports = errorHandler;
