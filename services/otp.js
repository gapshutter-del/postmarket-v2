const otpStore = new Map();

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function saveOTP(email) {

    const otp = generateOTP();

    otpStore.set(email.toLowerCase(), {

        otp,

        expires: Date.now() + (10 * 60 * 1000)

    });

    return otp;

}

function verifyOTP(email, code) {

    const record = otpStore.get(email.toLowerCase());

    if (!record) {
        return false;
    }

    if (Date.now() > record.expires) {

        otpStore.delete(email.toLowerCase());

        return false;

    }

    if (record.otp !== code) {
        return false;
    }

    otpStore.delete(email.toLowerCase());

    return true;

}

module.exports = {

    saveOTP,

    verifyOTP

};
