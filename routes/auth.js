const express = require("express");
const resend = require("../config/resend");
const supabase = require("../config/supabase");
const jwt = require("jsonwebtoken");

const JWT_SECRET =
    process.env.JWT_SECRET || "super-secret-jwt-key-change-in-production";
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

router.post("/verify-otp", async (req, res) => {
  try {

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

    const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("email", email);


if (error) throw error;

if (!data || data.length !== 1) {
  return res.status(500).json({
    success: false,
    message: `Expected 1 user, found ${data ? data.length : 0}`
  });
}

const user = data[0];

   const token = jwt.sign(
  {
    sub: user.ref,
    email: user.email,
    type: user.type
  },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      data: {
        token,
        user
      }
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
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
  password,
  name,
  type,
  company_name,
  niche,
  audience_desc,
  platforms,
  total_reach,
  rate,
  sa_id,
  payout_method,
  wallet_id
} = req.body;

    if (!email || !password || !name || !type) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Create authentication account

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({

        email,
        password,
        email_confirm: true

      });

    if (authError) {
      throw authError;
    }

    // Create profile

    const profile = {

      id: authData.user.id,
      ref: authData.user.id,
      email,
      name,
      type,
      status: "active",

      company_name: company_name || null,

      niche: niche || null,
      audience_desc: audience_desc || null,
      platforms: platforms || [],
      total_reach: total_reach || 0,
      rate: rate || 0,
      sa_id: sa_id || null,
      payout_method: payout_method || null,
      wallet_id: wallet_id || null,

      password_hash: ""

    };

    const { data, error } = await supabase

      .from("users")

      .insert(profile)

      .select()

      .single();

    if (error) {
      throw error;
    }

   const token = jwt.sign(
  {
    sub: data.ref,
    email: data.email,
    type: data.type
  },
  JWT_SECRET,
  {
    expiresIn: "7d"
  }
);

return res.json({
  success: true,
  data: {
    token,
    user: data
  }
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

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Authenticate against Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (authError) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Load business profile
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error) throw error;

    // Create PostMarket JWT
    const token = jwt.sign(
      {
        sub: user.ref,
        email: user.email,
        type: user.type
      },
      JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

   


    return res.json({
      success: true,
     data: {
  token,
  user,
  supabaseSession: authData.session
} 
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }

});
// -----------------------------------------------------------------------------
// AUTHENTICATED USER
// -----------------------------------------------------------------------------

router.get("/me", async (req, res) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const token = authHeader.split(" ")[1];
   

    const payload = jwt.verify(token, JWT_SECRET);

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("ref", payload.sub)
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      data: user
    });

  } catch (err) {

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });

  }
});
// -----------------------------------------------------------------------------
// UPDATE CREATOR PROFILE
// -----------------------------------------------------------------------------

router.put("/profile", async (req, res) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET);


    const {
  name,
  niche,
  audience_desc,
  platforms,
  total_reach,
  rate,
  profile_photo,
  cover_photo
} = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({
  name,
  niche,
  audience_desc,
  platforms,
  total_reach,
  rate,
  profile_photo,
  cover_photo,
  profile_status: "draft",
})
      .eq("ref", payload.sub)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      data
    });

  } catch (err) {


    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
});
/*
|--------------------------------------------------------------------------
| DISCOVER CREATORS
|--------------------------------------------------------------------------
*/

router.get("/creators", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(`
        ref,
        name,
        niche,
        platforms,
        total_reach,
        rate,
        profile_photo,
        cover_photo
      `)
      .eq("type", "creator");

    if (error) throw error;

    return res.json({
      success: true,
      data,
    });

  } catch (err) {
    

    return res.status(500).json({
      success: false,
      message: "Unable to load creators.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| PUBLIC CREATOR
|--------------------------------------------------------------------------
*/

router.get("/creators/:ref", async (req, res) => {
 

  try {

    const { ref } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select(`
        ref,
        name,
        niche,
        audience_desc,
        platforms,
        total_reach,
        rate,
        profile_photo,
        cover_photo
      `)
      .eq("ref", ref)
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      data,
    });

  } catch (err) {



    return res.status(404).json({
      success: false,
      message: "Creator not found.",
    });

  }
});
/*
|--------------------------------------------------------------------------
| SAVE CREATOR
|--------------------------------------------------------------------------
*/

router.post("/favorites", async (req, res) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const token = authHeader.split(" ")[1];


    const payload = jwt.verify(token, JWT_SECRET);

   const { creator_ref } = req.body;

if (!creator_ref) {
  return res.status(400).json({
    success: false,
    message: "creator_ref is required"
  });
}
    const { data, error } = await supabase
      .from("favorites")
      .insert({
        advertiser_ref: payload.sub,
        creator_ref
      })
      .select()
      .single();

    if (error) throw error;


    return res.json({
      success: true,
      data
    });

  } catch (err) {

    console.error("FAVORITES ERROR:");
console.error(err);

if (err.code) console.error("Code:", err.code);
if (err.message) console.error("Message:", err.message);
if (err.details) console.error("Details:", err.details);
if (err.hint) console.error("Hint:", err.hint);

return res.status(500).json({
  success: false,
  message: "Unable to save creator."
});

  }
});

/*
|--------------------------------------------------------------------------
| MY ROSTER
|--------------------------------------------------------------------------
*/

// -----------------------------------------------------------------------------
// MY ROSTER
// -----------------------------------------------------------------------------


router.get("/favorites", async (req, res) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET);

    const { data, error } = await supabase
      .from("favorites")
      .select(`
  id,
  creator_ref,
  users!favorites_creator_ref_fkey(
          ref,
          name,
          niche,
          audience_desc,
          platforms,
          total_reach,
          rate,
          profile_photo,
          cover_photo
        )
      `)
      .eq("advertiser_ref", payload.sub);

    if (error) throw error;

    return res.json({
      success: true,
      data
    });

  } catch (err) {

    console.error("Favorites error:");
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Unable to load roster."
    });

  }
});
  
/*
|--------------------------------------------------------------------------
| REMOVE FROM ROSTER
|--------------------------------------------------------------------------
*/

router.delete("/favorites/:creatorRef", async (req, res) => {

  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET);

    const { creatorRef } = req.params;

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("advertiser_ref", payload.sub)
      .eq("creator_ref", creatorRef);

    if (error) throw error;

    return res.json({
      success: true
    });

  } catch (err) {

    console.error("Remove favorite error:");
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Unable to remove creator."
    });

  }

});

module.exports = router;