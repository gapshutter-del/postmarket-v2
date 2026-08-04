const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

const supabase = require("../config/supabase");

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, JWT_SECRET);

    const {
      title,
      objective,
      caption,
      notes,
    } = req.body;

    const { data, error } = await supabase
      .from("campaigns")
      .insert({
        advertiser_ref: payload.sub,
        title,
        objective,
        caption,
        notes,
      })
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      data,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/:campaignRef", async (req, res) => {

const { campaignRef } = req.params;
const authHeader = req.headers.authorization;

if (!authHeader || !authHeader.startsWith("Bearer ")) {
  return res.status(401).json({
    success: false,
    message: "Unauthorized",
  });
}

const token = authHeader.split(" ")[1];
const payload = jwt.verify(token, JWT_SECRET);

const { data, error } = await supabase
  .from("campaigns")
  .select("*")
  .eq("campaign_ref", campaignRef)
  .eq("advertiser_ref", payload.sub)
  .single();

if (error) throw error;

});

module.exports = router;