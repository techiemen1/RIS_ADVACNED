// src/services/dictationService.ts

class DictationService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private onTextCallback: (text: string) => void = () => {};
  private onStatusCallback: (status: string) => void = () => {};

  async start(
    onText: (text: string) => void,
    onStatus?: (status: string) => void
  ) {
    this.onTextCallback = onText;
    this.onStatusCallback = onStatus || (() => {});

    if (!navigator.mediaDevices?.getUserMedia) {
      this.onStatusCallback("Microphone not supported in this browser");
      throw new Error("getUserMedia not supported");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    this.chunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };

    this.mediaRecorder.onstop = async () => {
      try {
        this.onStatusCallback("Processing audio...");
        const blob = new Blob(this.chunks, { type: "audio/webm" });
        const buffer = await blob.arrayBuffer();

        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (s, b) => s + String.fromCharCode(b),
            ""
          )
        );

        const res = await fetch("/api/stt/recognize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioBase64: base64 }),
        });

        const json = await res.json();
        if (json.success && json.text) {
          this.onTextCallback(json.text);
          this.onStatusCallback("Dictation complete");
        } else {
          this.onStatusCallback("No text recognized");
        }
      } catch (err: any) {
        console.error("DictationService stop error", err);
        this.onStatusCallback(
          err?.message || "STT failed. Please try again or check server."
        );
      }
    };

    this.mediaRecorder.start();
    this.onStatusCallback("Recording...");
  }

  async stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.onStatusCallback("Stopping...");
  }

  isRecording() {
    return !!this.mediaRecorder && this.mediaRecorder.state === "recording";
  }
}

const dictationService = new DictationService();
export default dictationService;
