import os
import uuid
from flask_cors import CORS
from flask import Flask, request, jsonify, send_file
from pydub import AudioSegment
import librosa
import librosa.effects
import matplotlib
matplotlib.use('Agg')  # Set the backend before importing pyplot
import matplotlib.pyplot as plt
import numpy as np
import scipy.signal
from scipy.io import wavfile

app = Flask(__name__)
CORS(app)

# Ensure the static directory exists
os.makedirs('./static', exist_ok=True)

current_audio_state = {
    'raw_filepath': None,
    'processed_filepath': None,
    'sr': None,
    'y_raw': None,
    'y_processed': None
}

def create_visualization(y_raw, y_processed, sr, title, output_path):
    plt.figure(figsize=(12, 6))
    
    # Use non-interactive mode for thread safety
    with plt.style.context('default'):
        plt.subplot(2, 2, 1)
        librosa.display.waveshow(y_raw, sr=sr)
        plt.title('Original Waveform')
        
        plt.subplot(2, 2, 2)
        D = librosa.stft(y_raw)
        S_db = librosa.amplitude_to_db(np.abs(D), ref=np.max)
        librosa.display.specshow(S_db, sr=sr, y_axis='hz', x_axis='time')
        plt.colorbar(format='%+2.0f dB')
        plt.title('Original Spectrogram')
        
        plt.subplot(2, 2, 3)
        librosa.display.waveshow(y_processed, sr=sr)
        plt.title(f'{title} Waveform')
        
        plt.subplot(2, 2, 4)
        D_processed = librosa.stft(y_processed)
        S_db_processed = librosa.amplitude_to_db(np.abs(D_processed), ref=np.max)
        librosa.display.specshow(S_db_processed, sr=sr, y_axis='hz', x_axis='time')
        plt.colorbar(format='%+2.0f dB')
        plt.title(f'{title} Spectrogram')
        
        plt.tight_layout()
        plt.savefig(output_path)
        plt.close('all')  # Ensure all figures are closed

def save_audio(y, sr, output_path):
    y = librosa.util.normalize(y)
    wavfile.write(output_path, sr, (y * 32767).astype(np.int16))

def apply_equalization(y, low_gain, mid_gain, high_gain):
    y_harmonic, y_percussive = librosa.effects.hpss(y)
    y_processed = (
        y_harmonic * low_gain +
        y_percussive * mid_gain +
        librosa.effects.preemphasis(y) * high_gain
    )
    return y_processed

def apply_compression(y, threshold, ratio):
    S = librosa.stft(y)
    rms = librosa.feature.rms(S=np.abs(S))
    db = librosa.amplitude_to_db(rms)
    compressed = np.where(db > threshold, threshold + (db - threshold) / ratio, db)
    y_processed = librosa.db_to_amplitude(compressed) * np.sign(y)
    return y_processed

def apply_time_stretch(y, sr, rate, n_steps):
    y_processed = librosa.effects.time_stretch(y, rate=rate)
    if n_steps != 0:
        y_processed = librosa.effects.pitch_shift(y_processed, sr=sr, n_steps=n_steps)
    return y_processed

@app.route('/upload', methods=['POST'])
def upload_audio():
    global current_audio_state
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        unique_folder = f'./static/file-{uuid.uuid4().hex}'
        os.makedirs(unique_folder, exist_ok=True)
        
        raw_filepath = os.path.join(unique_folder, 'raw_audio.mp3')
        file.save(raw_filepath)
        
        try:
            wav_filepath = os.path.join(unique_folder, 'processed_audio.wav')
            audio = AudioSegment.from_mp3(raw_filepath)
            audio.export(wav_filepath, format='wav')
        except Exception as e:
            return jsonify({
                "error": f"Failed to process audio: {str(e)}. Make sure ffmpeg is installed."
            }), 500
        
        y_raw, sr = librosa.load(raw_filepath)
        
        current_audio_state = {
            'raw_filepath': raw_filepath,
            'processed_filepath': wav_filepath,
            'sr': sr,
            'y_raw': y_raw,
            'y_processed': y_raw.copy()
        }
        
        plots_filepath = os.path.join(unique_folder, 'initial_audio_plots.png')
        create_visualization(y_raw, y_raw, sr, 'Initial', plots_filepath)
        
        return jsonify({
            "raw_file_url": f"/serve-file/{raw_filepath}",
            "processed_file_url": f"/serve-file/{wav_filepath}",
            "plots_url": f"/serve-file/{plots_filepath}"
        })
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/apply-gain', methods=['POST'])
def apply_gain():
    try:
        if current_audio_state['y_raw'] is None:
            return jsonify({"error": "No audio loaded. Upload a file first."}), 400

        data = request.get_json()
        low_gain = float(data.get('low_gain', 1.0))
        mid_gain = float(data.get('mid_gain', 1.0))
        high_gain = float(data.get('high_gain', 1.0))

        y_processed = apply_equalization(current_audio_state['y_raw'], low_gain, mid_gain, high_gain)

        unique_folder = f'./static/gain-{uuid.uuid4().hex}'
        os.makedirs(unique_folder, exist_ok=True)

        processed_filepath = os.path.join(unique_folder, 'gain_processed.wav')
        plot_path = os.path.join(unique_folder, 'gain_plots.png')

        save_audio(y_processed, current_audio_state['sr'], processed_filepath)
        create_visualization(current_audio_state['y_raw'], y_processed, current_audio_state['sr'], 'Gain', plot_path)

        current_audio_state['y_processed'] = y_processed
        current_audio_state['processed_filepath'] = processed_filepath

        return jsonify({
            "raw_file_url": f"/serve-file/{current_audio_state['raw_filepath']}",
            "processed_file_url": f"/serve-file/{processed_filepath}",
            "plots_url": f"/serve-file/{plot_path}"
        })
    except Exception as e:
        return jsonify({"error": f"Gain processing failed: {str(e)}"}), 500

@app.route('/apply-compression', methods=['POST'])
def apply_compression_route():
    try:
        if current_audio_state['y_processed'] is None:
            return jsonify({"error": "No processed audio available. Apply a gain first."}), 400

        data = request.get_json()
        threshold = float(data.get('threshold', -20))
        ratio = float(data.get('ratio', 4))

        y_processed = apply_compression(current_audio_state['y_processed'], threshold, ratio)

        unique_folder = f'./static/compress-{uuid.uuid4().hex}'
        os.makedirs(unique_folder, exist_ok=True)

        processed_filepath = os.path.join(unique_folder, 'compress_processed.wav')
        plot_path = os.path.join(unique_folder, 'compress_plots.png')

        save_audio(y_processed, current_audio_state['sr'], processed_filepath)
        create_visualization(current_audio_state['y_processed'], y_processed, current_audio_state['sr'], 'Compression', plot_path)

        current_audio_state['y_processed'] = y_processed
        current_audio_state['processed_filepath'] = processed_filepath

        return jsonify({
            "raw_file_url": f"/serve-file/{current_audio_state['raw_filepath']}",
            "processed_file_url": f"/serve-file/{processed_filepath}",
            "plots_url": f"/serve-file/{plot_path}"
        })
    except Exception as e:
        return jsonify({"error": f"Compression processing failed: {str(e)}"}), 500

@app.route('/apply-pitch-shift', methods=['POST'])
def apply_pitch_shift():
    try:
        if current_audio_state['y_processed'] is None:
            return jsonify({"error": "No processed audio available. Apply a gain or compression first."}), 400

        data = request.get_json()
        rate = float(data.get('rate', 1.0))
        n_steps = int(data.get('n_steps', 0))

        y_processed = apply_time_stretch(current_audio_state['y_processed'], current_audio_state['sr'], rate, n_steps)

        unique_folder = f'./static/pitch-{uuid.uuid4().hex}'
        os.makedirs(unique_folder, exist_ok=True)

        processed_filepath = os.path.join(unique_folder, 'pitch_processed.wav')
        plot_path = os.path.join(unique_folder, 'pitch_plots.png')

        save_audio(y_processed, current_audio_state['sr'], processed_filepath)
        create_visualization(current_audio_state['y_processed'], y_processed, current_audio_state['sr'], 'Pitch Shift', plot_path)

        current_audio_state['y_processed'] = y_processed
        current_audio_state['processed_filepath'] = processed_filepath

        return jsonify({
            "raw_file_url": f"/serve-file/{current_audio_state['raw_filepath']}",
            "processed_file_url": f"/serve-file/{processed_filepath}",
            "plots_url": f"/serve-file/{plot_path}"
        })
    except Exception as e:
        return jsonify({"error": f"Pitch shift processing failed: {str(e)}"}), 500

@app.route('/serve-file/<path:filename>')
def serve_file(filename):
    try:
        return send_file(filename, as_attachment=False)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)