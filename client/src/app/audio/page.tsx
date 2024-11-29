"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { AudioRecorder } from "@/components/AudioRecorder";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AudioFiles {
  rawFile: string | null;
  processedFile: string | null;
  plotsUrl: string | null;
}

export default function AudioPage() {
  const [audioFiles, setAudioFiles] = useState<AudioFiles>({
    rawFile: null,
    processedFile: null,
    plotsUrl: null,
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [eqParams, setEqParams] = useState({
    low_gain: 1,
    mid_gain: 1,
    high_gain: 1,
  });
  const [compParams, setCompParams] = useState({ threshold: -20, ratio: 4 });
  const [timeStretchParams, setTimeStretchParams] = useState({
    rate: 1,
    n_steps: 0,
  });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && file.type === "audio/mpeg") {
      await processAudio(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload an MP3 file.",
        variant: "destructive",
      });
    }
  };

  const handleRecordingComplete = async (blob: Blob) => {
    await processAudio(blob);
  };

  const processAudio = async (audioData: File | Blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", audioData, "audio.mp3");
    try {
      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
        mode: "cors",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText}. Server response: ${errorText}`
        );
      }
      const data = await response.json();
      setAudioFiles({
        rawFile: data.raw_file_url,
        processedFile: data.processed_file_url,
        plotsUrl: data.plots_url,
      });
      toast({
        title: "Processing complete",
        description: "Your audio has been processed successfully.",
      });
    } catch (error) {
      console.error("Audio processing failed", error);
      toast({
        title: "Processing failed",
        description: `There was an error processing your audio: ${
          error instanceof Error ? error.message : "Unknown error"
        }. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const applyGain = async () => {
    if (!audioFiles.rawFile) {
      toast({
        title: "No audio file",
        description: "Please upload or record an audio file first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("http://localhost:5000/apply-gain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          low_gain: eqParams.low_gain,
          mid_gain: eqParams.mid_gain,
          high_gain: eqParams.high_gain,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAudioFiles((prev) => ({
        ...prev,
        processedFile: data.processed_file_url,
        plotsUrl: data.plots_url,
      }));
      toast({
        title: "Gain applied",
        description: "Gain effect applied successfully.",
      });
    } catch (error) {
      console.error("Error applying gain effect:", error);
      toast({
        title: "Gain application failed",
        description:
          "There was an error applying the gain effect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const applyCompression = async () => {
    if (!audioFiles.rawFile) {
      toast({
        title: "No audio file",
        description: "Please upload or record an audio file first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("http://localhost:5000/apply-compression", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threshold: compParams.threshold,
          ratio: compParams.ratio,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAudioFiles((prev) => ({
        ...prev,
        processedFile: data.processed_file_url,
        plotsUrl: data.plots_url,
      }));
      toast({
        title: "Compression applied",
        description: "Compression effect applied successfully.",
      });
    } catch (error) {
      console.error("Error applying compression effect:", error);
      toast({
        title: "Compression application failed",
        description:
          "There was an error applying the compression effect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const applyPitchShift = async () => {
    if (!audioFiles.rawFile) {
      toast({
        title: "No audio file",
        description: "Please upload or record an audio file first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("http://localhost:5000/apply-pitch-shift", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rate: timeStretchParams.rate,
          n_steps: timeStretchParams.n_steps,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAudioFiles((prev) => ({
        ...prev,
        processedFile: data.processed_file_url,
        plotsUrl: data.plots_url,
      }));
      toast({
        title: "Pitch shift applied",
        description: "Pitch shift effect applied successfully.",
      });
    } catch (error) {
      console.error("Error applying pitch shift effect:", error);
      toast({
        title: "Pitch shift application failed",
        description:
          "There was an error applying the pitch shift effect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Audio Processing</h1>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Upload Audio</h2>
          <Input
            type="file"
            accept=".mp3"
            onChange={handleFileUpload}
            disabled={isProcessing || isRecording}
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Record Audio</h2>
          <AudioRecorder
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            onRecordingComplete={handleRecordingComplete}
            disabled={isProcessing}
          />
        </div>
        {isProcessing && (
          <div className="text-center">
            <p className="text-lg font-semibold">Processing audio...</p>
          </div>
        )}
        {audioFiles.rawFile && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Original Audio</h2>
            <audio
              src={`http://localhost:5000${audioFiles.rawFile}`}
              controls
              className="w-full"
            />
          </div>
        )}
        {audioFiles.processedFile && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Processed Audio</h2>
            <audio
              ref={audioRef}
              src={`http://localhost:5000${audioFiles.processedFile}`}
              controls
              className="w-full"
            />
          </div>
        )}
        {audioFiles.plotsUrl && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Audio Plots</h2>
            <div className="relative w-full h-64">
              <Image
                src={`http://localhost:5000${audioFiles.plotsUrl}`}
                alt="Audio Plots"
                layout="fill"
                objectFit="contain"
              />
            </div>
          </div>
        )}
        <div>
          <h2 className="text-xl font-semibold mb-2">Audio Effects</h2>
          <Tabs defaultValue="gain" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="gain">Gain</TabsTrigger>
              <TabsTrigger value="compression">Compression</TabsTrigger>
              <TabsTrigger value="pitch">Pitch Shift</TabsTrigger>
            </TabsList>
            <TabsContent value="gain">
              <div className="space-y-4">
                <div>
                  <label>Low Gain: {eqParams.low_gain.toFixed(2)}</label>
                  <Slider
                    min={0}
                    max={2}
                    step={0.1}
                    value={[eqParams.low_gain]}
                    onValueChange={(value: number[]) =>
                      setEqParams({ ...eqParams, low_gain: value[0] })
                    }
                  />
                </div>
                <div>
                  <label>Mid Gain: {eqParams.mid_gain.toFixed(2)}</label>
                  <Slider
                    min={0}
                    max={2}
                    step={0.1}
                    value={[eqParams.mid_gain]}
                    onValueChange={(value: number[]) =>
                      setEqParams({ ...eqParams, mid_gain: value[0] })
                    }
                  />
                </div>
                <div>
                  <label>High Gain: {eqParams.high_gain.toFixed(2)}</label>
                  <Slider
                    min={0}
                    max={2}
                    step={0.1}
                    value={[eqParams.high_gain]}
                    onValueChange={(value: number[]) =>
                      setEqParams({ ...eqParams, high_gain: value[0] })
                    }
                  />
                </div>
                <Button
                  onClick={applyGain}
                  disabled={isProcessing || !audioFiles.rawFile}
                >
                  Apply Gain
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="compression">
              <div className="space-y-4">
                <div>
                  <label>
                    Compression Threshold: {compParams.threshold.toFixed(2)} dB
                  </label>
                  <Slider
                    min={-60}
                    max={0}
                    step={1}
                    value={[compParams.threshold]}
                    onValueChange={(value: number[]) =>
                      setCompParams({ ...compParams, threshold: value[0] })
                    }
                  />
                </div>
                <div>
                  <label>
                    Compression Ratio: {compParams.ratio.toFixed(2)}:1
                  </label>
                  <Slider
                    min={1}
                    max={20}
                    step={0.1}
                    value={[compParams.ratio]}
                    onValueChange={(value: number[]) =>
                      setCompParams({ ...compParams, ratio: value[0] })
                    }
                  />
                </div>
                <Button
                  onClick={applyCompression}
                  disabled={isProcessing || !audioFiles.rawFile}
                >
                  Apply Compression
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="pitch">
              <div className="space-y-4">
                <div>
                  <label>
                    Time Stretch Rate: {timeStretchParams.rate.toFixed(2)}
                  </label>
                  <Slider
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[timeStretchParams.rate]}
                    onValueChange={(value: number[]) =>
                      setTimeStretchParams({
                        ...timeStretchParams,
                        rate: value[0],
                      })
                    }
                  />
                </div>
                <div>
                  <label>
                    Pitch Shift: {timeStretchParams.n_steps} semitones
                  </label>
                  <Slider
                    min={-12}
                    max={12}
                    step={1}
                    value={[timeStretchParams.n_steps]}
                    onValueChange={(value: number[]) =>
                      setTimeStretchParams({
                        ...timeStretchParams,
                        n_steps: value[0],
                      })
                    }
                  />
                </div>
                <Button
                  onClick={applyPitchShift}
                  disabled={isProcessing || !audioFiles.rawFile}
                >
                  Apply Pitch Shift
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
