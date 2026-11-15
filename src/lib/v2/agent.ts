// Milo v2's ElevenLabs agent (approach B, docs/V2.md). /api/v2/elevenlabs/setup creates or updates
// the agent and its update_board tool from these, so the agent's setup lives in the repo.

import { V2_TOPICS } from "./topics";

export const V2_AGENT_NAME = "Milo v2";
/**
 * The same Milo, plus one setting: a conversation may bring its own speech-to-text keywords, so a
 * course's hard words ("thylakoid", "Anschluss") are heard right. It is a separate agent, used only
 * when the session address has &agent=words, so the tested "Milo v2" agent is never changed.
 * Made on Sun 15 Nov to compare by voice. Not tested by voice yet: see docs/V2.md.
 */
export const V2_WORDS_AGENT_NAME = "Milo v2 words";
export type AgentVariant = "words";

export function agentName(variant?: AgentVariant | null): string {
  return variant === "words" ? V2_WORDS_AGENT_NAME : V2_AGENT_NAME;
}
export const UPDATE_BOARD = "update_board";

/** The client tool. The browser runs it: Claude scores the turn, the board redraws, Milo's line comes back. */
export const UPDATE_BOARD_TOOL = {
  type: "client",
  name: UPDATE_BOARD,
  description:
    "Redraws your sheet from what the student just said, and returns the exact line you must say next. " +
    "Call it every time the student finishes explaining a point, answers your question, says they are stuck, " +
    "or asks you something about the topic.",
  parameters: {
    type: "object",
    properties: {
      point: {
        type: "string",
        description: "What the student just said, in their own words.",
      },
    },
    required: ["point"],
  },
  // Milo waits for the line, so what he says always matches the board.
  expects_response: true,
  response_timeout_secs: 30,
  // He says a few words about drawing while Claude scores the turn, so the wait never feels empty.
  pre_tool_speech: "force",
  execution_mode: "immediate",
  interruption_mode: "allow",
};

export const V2_AGENT_PROMPT = `You are Milo, a curious, slightly cheeky kid of about eight. You know nothing about {{topic_about}}. A student is explaining it to you out loud, to learn it themselves. You draw what they say on a sheet of paper, and you talk with them about your drawing. You are not a teacher.

How each turn works:
- When the student stops talking, call the update_board tool with what they said. Do it every time: after a long answer or a short one, an answer that trails off mid-sentence, an "I don't know", or a question to you. The only exception is when they clearly ask for time, see below.
- While it runs, say only a few words about drawing, such as "Ooh, wait, I'm drawing that". Never ask a question there.
- When update_board returns, say the line it gives you, word for word, as your own. Say nothing before or after it.
- If update_board fails or gives no line, say: "Oops, my crayon slipped! Can you say that again?"
- The app may send you a note starting with "APP NOTE". Never read it out. Say the line in it the next time you speak, unless update_board gives you a newer line.

Letting them think:
- A pause, an "um", or a sentence that trails off does not mean they want more time. Treat it as the end of their turn and call update_board. Your drawing helps them think.
- Only call skip_turn when the student clearly asks for time, with words like "wait", "hold on", "let me think" or "give me a second".
- When a wait ends and they are still quiet, say one short, calm line, such as "Take your time, I'm looking at my drawing." If an APP NOTE gave you a line you have not said yet, say that line instead.
- Never say "are you still there", and never hurry them.
- If they talk while you are speaking, stop and listen.

Never:
- explain, define, correct or teach anything. You do not know the answer.
- say a word about the topic that the student has not said, unless update_board or an APP NOTE gave it to you.
- use brackets, stage directions or emoji. Plain spoken words only.`;

/** The full agent body for the ElevenLabs create and update calls. */
export function v2AgentBody(toolId: string, voiceId?: string, variant?: AgentVariant | null) {
  const cell = V2_TOPICS.find((topic) => topic.id === "cell");
  return {
    name: agentName(variant),
    conversation_config: {
      agent: {
        // Set per session from the browser: a fresh start, or "welcome back" after a pause.
        first_message: "{{opening_line}}",
        language: "en",
        dynamic_variables: {
          dynamic_variable_placeholders: {
            opening_line: cell?.firstMessage ?? "Hi, I'm Milo!",
            topic_about: cell?.about ?? "this topic",
          },
        },
        prompt: {
          prompt: V2_AGENT_PROMPT,
          // ElevenLabs recommends a high-intelligence model when the agent calls tools.
          llm: process.env.ELEVENLABS_V2_AGENT_LLM || "claude-sonnet-5-5",
          tool_ids: [toolId],
          built_in_tools: {
            // Lets Milo stay quiet when the student asks for time. After 15 s of silence he checks in
            // gently, so a misread pause can never leave both of them waiting.
            skip_turn: {
              type: "system",
              name: "skip_turn",
              description: "",
              params: { system_tool_type: "skip_turn", wait_timeout_secs: 15 },
            },
          },
        },
      },
      // Patient: students pause, restart and correct themselves. Wait the longest before re-engaging.
      turn: { turn_eagerness: "patient", turn_timeout: 30 },
      // Hard names from every ready topic, so speech-to-text hears them.
      asr: { keywords: [...new Set(V2_TOPICS.flatMap((topic) => topic.keywords))] },
      ...(voiceId ? { tts: { voice_id: voiceId } } : {}),
    },
    platform_settings: {
      // Private agent: a conversation needs the token from /api/v2/elevenlabs/token.
      auth: { enable_auth: true },
      // Lets a session run as a typed chat, to test the whole loop without a microphone (?voice=text).
      // The "words" agent also lets a conversation bring its own speech-to-text keywords.
      overrides: {
        conversation_config_override: {
          conversation: { text_only: true },
          ...(variant === "words" ? { asr: { keywords: true } } : {}),
        },
      },
    },
  };
}
