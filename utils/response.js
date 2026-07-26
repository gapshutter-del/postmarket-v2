function success(res, message, data = null, status = 200) {
    return res.status(status).json({
        success: true,
        message,
        data
    });
}

function fail(res, status, message, errors = null) {
    return res.status(status).json({
        success: false,
        message,
        errors
    });
}

module.exports = {
    success,
    fail
};
