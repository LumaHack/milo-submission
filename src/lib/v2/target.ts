// Which topic a v2 page is about, read from its address. The session page, the end page and the
// links between them all use it, so a built-in topic and a part of a student's course work the same:
//   /v2/session?topic=ww2&mode=exam
//   /v2/session?course=<course id>&part=<part id>&mode=coach
// A part lives in this browser's storage, so readTarget only runs in the browser.

import type { Mode } from "./contract";
import { coursePartTopic } from "./courses";
import { getV2Topic, type V2Topic } from "./topics";

export type Target = {
  topic: V2Topic;
  mode: Mode;
  /** Names the topic and mode in an address, for example "topic=ww2&mode=exam". */
  query: string;
  /** Where "Pick another topic" goes: the start screen, or the course this part belongs to. */
  homeHref: string;
  /** "History, how World War II started, exam mode". */
  subjectLine: string;
};

type Params = { get(name: string): string | null };

export function readMode(params: Params): Mode {
  return params.get("mode") === "exam" ? "exam" : "coach";
}

/** The test switch from the address (&voice=off or &voice=text), kept on every link so a test stays a test. */
export function voiceSuffix(params: Params): string {
  const voice = params.get("voice");
  return voice === "off" || voice === "text" ? `&voice=${voice}` : "";
}

export function subjectLine(topic: V2Topic, mode: Mode): string {
  const about = `${topic.title.charAt(0).toLowerCase()}${topic.title.slice(1)}`;
  return `${topic.subject}, ${about}, ${mode === "exam" ? "exam mode" : "coach mode"}`;
}

/** Null when the address names a topic that does not exist, is not ready, or is no longer in this browser. */
export function readTarget(params: Params): Target | null {
  const mode = readMode(params);
  const courseId = params.get("course");
  const partId = params.get("part");

  if (courseId && partId) {
    const topic = coursePartTopic(courseId, partId);
    if (!topic) return null;
    return {
      topic,
      mode,
      query: `course=${encodeURIComponent(courseId)}&part=${encodeURIComponent(partId)}&mode=${mode}`,
      homeHref: `/v2/course?id=${encodeURIComponent(courseId)}`,
      subjectLine: subjectLine(topic, mode),
    };
  }

  const topic = getV2Topic(params.get("topic") ?? "cell");
  if (!topic || !topic.ready) return null;
  return {
    topic,
    mode,
    query: `topic=${encodeURIComponent(topic.id)}&mode=${mode}`,
    homeHref: "/v2",
    subjectLine: subjectLine(topic, mode),
  };
}
