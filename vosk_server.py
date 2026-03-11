import asyncio
import websockets
import json
import sys
from vosk import Model, KaldiRecognizer

# Load model once at startup
print("⏳ [Vosk] Loading model...")
try:
    model = Model("vosk-model")
    print("✅ [Vosk] Model loaded.")
    
    # Load medical dictionary for vocabulary steering
    with open("radiology_dictionary.json", "r") as f:
        medical_dict = json.load(f)
    
    # Extract unique words from all categories for steering
    medical_vocab = set()
    categories = [
        "modalities", "body_parts", "impressions_findings", 
        "patterns_descriptors", "qualifiers_modifiers", 
        "indian_specific", "msk_neuro_paed", "abbreviations_acronyms"
    ]
    
    for cat in categories:
        for phrase in medical_dict.get(cat, []):
            for word in phrase.split():
                medical_vocab.add(word.lower())
    
    # Also add the shortcut keys from voice_variants and expansions
    for set_name in ["voice_variants", "expansions"]:
        for shortcut in medical_dict.get(set_name, {}).keys():
            medical_vocab.add(shortcut.lower())
    
    # Add common English words as fallback
    medical_vocab.update(["the", "is", "a", "an", "and", "but", "or", "in", "on", "at", "to", "for", "with", "no", "not", "seen", "noted", "visible"])
    
    vocabulary_list = list(medical_vocab)
    print(f"📊 [Vosk] Injected {len(vocabulary_list)} medical terms for steering.")
except Exception as e:
    print(f"❌ [Vosk] Initial Load Failed: {e}")
    sys.exit(1)

async def handle_connection(websocket):
    addr = websocket.remote_address
    print(f"🔌 [Vosk] New connection: {addr}")
    rec = None
    sample_rate = 16000
    
    try:
        async for message in websocket:
            if isinstance(message, str):
                try:
                    data = json.loads(message)
                    if "config" in data:
                        sample_rate = int(data["config"].get("sampleRate", 16000))
                        print(f"🔄 [Vosk] Configured: {sample_rate}Hz")
                        # Use the medical vocabulary list for steering the recognizer
                        rec = KaldiRecognizer(model, sample_rate, json.dumps(vocabulary_list))
                except Exception as e:
                    print(f"⚠️ [Vosk] Config error: {e}")
            
            elif isinstance(message, bytes):
                if rec is None:
                    rec = KaldiRecognizer(model, sample_rate, json.dumps(vocabulary_list))
                
                # Protect against tiny/malformed chunks that cause C++ assertions
                if len(message) < 100:
                    continue

                try:
                    if rec.AcceptWaveform(message):
                        result = json.loads(rec.Result())
                        text = result.get("text", "")
                        if text:
                            print(f"🎤 [Vosk] Result: {text}")
                            await websocket.send(json.dumps({"text": text, "final": True}))
                    else:
                        partial = json.loads(rec.PartialResult())
                        text = partial.get("partial", "")
                        if text:
                            await websocket.send(json.dumps({"text": text, "final": False}))
                except Exception as re:
                    print(f"❌ [Vosk] Recognizer Crash: {re}. Resetting...")
                    rec = KaldiRecognizer(model, sample_rate, json.dumps(vocabulary_list))
                        
    except websockets.exceptions.ConnectionClosed:
        print(f"👋 [Vosk] Closed: {addr}")
    except Exception as e:
        print(f"❌ [Vosk] WS Error: {e}")

async def main():
    port = 5001
    print(f"🚀 Vosk V3 Server (WebSocket) on ws://0.0.0.0:{port}")
    async with websockets.serve(handle_connection, "0.0.0.0", port):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Stopped.")
