import * as sdk from "microsoft-cognitiveservices-speech-sdk";

let synthesizer: sdk.SpeechSynthesizer | null = null;

function getSynthesizer(): sdk.SpeechSynthesizer {
  if (synthesizer) {
    return synthesizer;
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY!,
    process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION!
  );

  // Use Nova voice (en-US-NovaNeural)
  speechConfig.speechSynthesisVoiceName = "en-US-NovaNeural";
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

  synthesizer = new sdk.SpeechSynthesizer(speechConfig);
  return synthesizer;
}

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const synth = getSynthesizer();

    synth.speakTextAsync(
      text,
      (result) => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve(result.audioData);
        } else {
          reject(
            new Error(
              `Speech synthesis failed: ${sdk.ResultReason[result.reason]}`
            )
          );
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}

export async function synthesizeSpeechWithSSML(
  text: string,
  rate: number = 1.0
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const synth = getSynthesizer();

    // SSML for controlling speech rate
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="en-US-NovaNeural">
          <prosody rate="${rate * 100}%">
            ${text}
          </prosody>
        </voice>
      </speak>
    `;

    synth.speakSsmlAsync(
      ssml,
      (result) => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve(result.audioData);
        } else {
          reject(
            new Error(
              `Speech synthesis failed: ${sdk.ResultReason[result.reason]}`
            )
          );
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}

export function closeSynthesizer() {
  if (synthesizer) {
    synthesizer.close();
    synthesizer = null;
  }
}
