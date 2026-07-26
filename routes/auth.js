const express = require("express");
const resend = require("../config/resend");
const supabase = require("../config/supabase");
const { saveOTP, verifyOTP } = require("../services/otp");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| SEND OTP
|--------------------------------------------------------------------------
*/

router.post("/send-otp", async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {

            return res.status(400).json({

                success: false,
                message: "Email is required"

            });

        }

        const otp = saveOTP(email);

        const response = await resend.emails.send({

            from: process.env.FROM_EMAIL,

            to: email,

            subject: "Your PostMarket verification code",

            html: `
                <h2>PostMarket</h2>

                <p>Your verification code is:</p>

                <h1 style="font-size:36px;">${otp}</h1>

                <p>This code expires in 10 minutes.</p>
            `

        });

        console.log("OTP sent:", response);

        return res.json({

            success: true,

            message: "OTP sent"

        });

    }

    catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

});

/*
|--------------------------------------------------------------------------
| VERIFY OTP
|--------------------------------------------------------------------------
*/

router.post("/verify-otp", (req, res) => {

    const { email, otp } = req.body;

    if (!email || !otp) {

        return res.status(400).json({

            success: false,
            message: "Email and OTP required"

        });

    }

    const valid = verifyOTP(email, otp);

    if (!valid) {

        return res.status(401).json({

            success: false,
            message: "Invalid or expired OTP"

        });

    }

    return res.json({

        success: true,
        message: "OTP verified"

    });

});

/*
|--------------------------------------------------------------------------
| SIGNUP
|--------------------------------------------------------------------------
*/

router.post("/signup", async (req, res) => {

    try {

        const {

            email,
            first_name,
            last_name,
            phone,
            role

        } = req.body;

        if (!email) {

            return res.status(400).json({

                success: false,
                message: "Email required"

            });

        }

        const { data, error } = await supabase

            .from("users")

            .insert({

                email,
                first_name,
                last_name,
                phone,
                role

            })

            .select()

            .single();

        if (error) throw error;

        return res.json({

            success: true,
            user: data

        });

    }

    catch (err) {

        console.error("Signup error:", err);

        return res.status(500).json({

            success: false,
            message: err.message

        });

    }

});

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

router.post("/login", async (req, res) => {

    try {

        const { email } = req.body;

        const { data, error } = await supabase

            .from("users")

            .select("*")

            .eq("email", email)

            .single();

        if (error) throw error;

        return res.json({

            success: true,

            user: data

        });

    }

    catch (err) {

        return res.status(500).json({

            success: false,

            message: err.message

        });

    }

});

module.exports = router;
