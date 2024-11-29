import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

interface AudioRecorderProps {
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  onRecordingComplete: (blob: Blob) => void;
  disabled: boolean;
}

export function AudioRecorder({
  isRecording,
  setIsRecording,
  onRecordingComplete,
  disabled,
}: AudioRecorderProps) {
  const [isPaused, setIsPaused] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    audioChunks.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
        if (audioBlob.size > 0) {
          try {
            const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
            const ffmpeg = new FFmpeg();
            await ffmpeg.load({
              coreURL: await toBlobURL(
                `${baseURL}/ffmpeg-core.js`,
                "text/javascript"
              ),
              wasmURL: await toBlobURL(
                `${baseURL}/ffmpeg-core.wasm`,
                "application/wasm"
              ),
            });

            await ffmpeg.writeFile("audio.webm", await fetchFile(audioBlob));
            await ffmpeg.exec(["-i", "audio.webm", "output.mp3"]);
            const data = await ffmpeg.readFile("output.mp3");

            const mp3Blob = new Blob([data], { type: "audio/mpeg" });
            onRecordingComplete(mp3Blob);
          } catch (error) {
            console.error("Error converting audio:", error);
            toast({
              title: "Conversion failed",
              description:
                "Failed to convert the recorded audio to MP3. Please try again.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Recording failed",
            description: "No audio data was captured. Please try again.",
            variant: "destructive",
          });
        }
      };

      mediaRecorder.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        toast({
          title: "Recording error",
          description: "An error occurred during recording. Please try again.",
          variant: "destructive",
        });
        stopRecording();
      };

      mediaRecorder.current.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Recording failed",
        description:
          "Unable to access the microphone. Please check your permissions and try again.",
        variant: "destructive",
      });
    }
  }, [setIsRecording, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setIsPaused(false);
    }
  }, [setIsRecording]);

  const togglePause = useCallback(() => {
    if (mediaRecorder.current) {
      if (isPaused) {
        mediaRecorder.current.resume();
      } else {
        mediaRecorder.current.pause();
      }
      setIsPaused(!isPaused);
    }
  }, [isPaused]);

  return (
    <div className="flex space-x-2">
      {!isRecording ? (
        <Button onClick={startRecording} disabled={disabled}>
          Start Recording
        </Button>
      ) : (
        <>
          <Button onClick={togglePause} disabled={disabled}>
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button
            onClick={stopRecording}
            variant="destructive"
            disabled={disabled}
          >
            Stop Recording
          </Button>
        </>
      )}
    </div>
  );
}
