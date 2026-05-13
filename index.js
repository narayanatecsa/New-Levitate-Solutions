const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TOKEN;
const VERIFY = process.env.MYTOKEN;

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// VERIFY WEBHOOK
app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY
  ) {
    return res.send(req.query["hub.challenge"]);
  }
  res.sendStatus(403);
});

// MAIN WEBHOOK
app.post("/webhook", async (req, res) => {
  try {
    const change = req.body.entry?.[0]?.changes?.[0]?.value;
    if (!change) return res.sendStatus(200);

    const msg = change.messages?.[0];
    if (!msg) return res.sendStatus(200);

    const from = msg.from;
    const pid = change.metadata.phone_number_id;

    // HI MESSAGE
    if (msg.type === "text") {
      const text = msg.text.body.toLowerCase().trim();

      if (text === "hi") {
        await sendText(
          pid,
          from,
          "Hi, Welcome to Levitate Solutions"
        );

        await sendButtons(
          pid,
          from,
          "Click below to receive OTP",
          [
            {
              type: "reply",
              reply: {
                id: "SEND_OTP",
                title: "Send OTP"
              }
            }
          ]
        );
      }
    }

    // BUTTON CLICK
    if (
      msg.type === "interactive" &&
      msg.interactive?.button_reply
    ) {
      const id = msg.interactive.button_reply.id;

      if (id === "SEND_OTP") {
        const otp = generateOTP();

        await sendText(
          pid,
          from,
          `Your OTP is: ${otp}\nValid for 5 minutes.`
        );
      }
    }

    res.sendStatus(200);

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.sendStatus(200);
  }
});

async function sendText(pid, to, body) {
  await axios.post(
    `https://graph.facebook.com/v23.0/${pid}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body }
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    }
  );
}

async function sendButtons(pid, to, text, buttons) {
  await axios.post(
    `https://graph.facebook.com/v23.0/${pid}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text },
        action: { buttons }
      }
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    }
  );
}

app.listen(3000, () => {
  console.log("OTP Bot running on port 3000");
});
