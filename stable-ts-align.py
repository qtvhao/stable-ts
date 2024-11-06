import sys
import os
import json
import subprocess
from difflib import SequenceMatcher
import unicodedata
# 
def ends_with(text, char):
    """
    Checks if the text ends with a character.
    
    Args:
        text (str): The text to check.
        char (str): The character to check.
        
    Returns:
        bool: True if the text ends with the character, False otherwise.
    """
    return text[-1].strip() == char


def calculate_similarity_ratio(segment_text, candidate_text):
    """
    Calculate the similarity ratio between the last 10 words of two strings.
    
    Args:
        segment_text (str): The text from corrected segments.
        candidate_text (str): The text from tokens.
        
    Returns:
        float: Similarity ratio between the last 10 words of the two texts.
    """
    
    # Check if lengths are equal 0
    if len(segment_text) == 0 or len(candidate_text) == 0:
        return 0.0
    # Take the last 10 words of each text
    segment_words = segment_text.split()[-10:]
    candidate_words = candidate_text.split()[-10:]
    # Join back into strings to calculate similarity
    segment_last_10 = " ".join(segment_words)
    candidate_last_10 = " ".join(candidate_words)
    # print(f"Segment: {segment_last_10}")
    # print(f"Candidate: {candidate_last_10}")
    
    return SequenceMatcher(None, segment_last_10, candidate_last_10).ratio()

def get_remaining_tokens(all_tokens, match_index, segment_length):
    """
    Get the remaining tokens after the matched segment in list format.
    
    Args:
        all_tokens (list of str): Flattened list of tokens from tokens_texts.
        match_index (int): The starting index of the matched tokens.
        segment_length (int): The length of the matched segment in words.
        
    Returns:
        list of str: Remaining tokens after the matched segment in list format.
    """
    remaining_tokens = all_tokens[match_index + segment_length:]
    return remaining_tokens

def get_processed_and_remaining_sentences(sentences_texts, corrected_segments):
    """
    Get the processed and remaining sentences, given the corrected segments and sentences.
    Find the best match segment in `corrected_segments` for `sentences_texts`.
    """
    segments_texts = [segment['text'].strip() for segment in corrected_segments]
    segments_texts_joined = " ".join(segments_texts)
    highest_ratio = 0
    best_match = None
    for i, sentence_text in enumerate(sentences_texts):
        sentence_text = " ".join(sentences_texts[:i])
        ratio = calculate_similarity_ratio(sentence_text, segments_texts_joined)
        if ratio >= highest_ratio:
            highest_ratio = ratio
            best_match = i
    processed_sentences = sentences_texts[:best_match]
    remaining_sentences = sentences_texts[best_match:]
    
    return processed_sentences, remaining_sentences

def find_best_segment_match(corrected_segments, sentences_texts):
    """
    Find the best match segment in `corrected_segments` for `sentences_texts`.
    
    Args:
        corrected_segments (list of dict): List of dictionaries containing 'text' from corrected segments.
        sentences_texts (list of str): List of strings, each representing a sentence.
        
    Returns:
        tuple: (Index of the best match segment, best match segment dictionary, list of `remaining_sentences_texts`).
    """

    matched_sentences, remaining_sentences_texts = get_processed_and_remaining_sentences(sentences_texts, corrected_segments)
    # Loop over each corrected segment
    # 
    highest_ratio = 0
    matched_sentences_joined = " ".join(matched_sentences)
    print("=====================================")
    print(f"Matched: {matched_sentences_joined}")
    print("=====================================")
    print(f"Remaining: {remaining_sentences_texts}")
    # raise ValueError("Stop")
    segments_to_add = None
    for j, segment in enumerate(corrected_segments):
        candidate_tokens = corrected_segments[:j]
        count_candidate_tokens = len(candidate_tokens)
        if count_candidate_tokens == 0:
            continue
        candidate_text = " ".join([segment['text'].strip() for segment in candidate_tokens])
        ratio = calculate_similarity_ratio(matched_sentences_joined, candidate_text)
        if ratio >= highest_ratio:
            # print(f"Ratio: {ratio}")
            # print("+")
            highest_ratio = ratio
            segments_to_add = candidate_tokens
            segments_end = segments_to_add[-1]['end']
    if None == segments_to_add:
        raise ValueError("No best match segment found")
    print("=====================================")
    # raise ValueError("Stop")
    return segments_to_add, segments_end, remaining_sentences_texts, matched_sentences

def cut_audio_file(audio_file, start = None, end = None):
    start_str = str(start).replace('.', '_') if start is not None else 'start'
    end_str = str(end).replace('.', '_') if end is not None else 'end'
    output_file = audio_file.replace('.mp3', f'_{start_str}_{end_str}.mp3')
    if start is None:
        subprocess.run(["ffmpeg", "-y", "-i", audio_file, "-to", str(end), "-c", "copy", output_file], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    elif end is None:
        subprocess.run(["ffmpeg", "-y", "-i", audio_file, "-ss", str(start), "-c", "copy", output_file], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        subprocess.run(["ffmpeg", "-y", "-i", audio_file, "-ss", str(start), "-to", str(end), "-c", "copy", output_file], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
    return output_file
# 
tokens_json = sys.argv[1]
audio_file = sys.argv[2]
output_file = sys.argv[3]
# 
tokens = json.loads(open(tokens_json).read())
tokens_texts = [token['text'] for token in tokens]

def get_segments_by_index(segments, index):
    corrected_segments = segments[:index]
    incorrected_segments = segments[index:]
    corrected_segments_joined = " ".join(corrected_segments)
    incorrected_segments_joined = " ".join(incorrected_segments)
    segments_joined = " ".join(segments)
    # incorrected_start = incorrected_segments[0]['start']
    print("=====================================")
    print(f"Segments: {segments_joined}")
    print("=====================================")
    print(f"Corrected: {corrected_segments_joined}")
    print("=====================================")
    print(f"Incorrected: {incorrected_segments_joined}")
    print("=====================================")
    # print(f"Incorrected Start: {incorrected_start}")
    
    return corrected_segments, incorrected_segments

import json
import stable_whisper
model = stable_whisper.load_model('tiny')

def get_segments_from_audio_file(audio_file, tokens_texts, output_file='output.json'):
    # Step 1: Align the tokens with the audio file
    alignment_result = model.align(audio_file, '\n\n'.join(tokens_texts), language="vi")
    alignment_result.save_as_json(output_file)

    # Step 2: Load the alignment results
    with open(output_file, 'r') as file:
        human_written_segments = json.load(file)
    
    segments = human_written_segments.get('segments', [])

    # Step 3: Find the best match segment for the tokens
    for i, segment in enumerate(segments):
        if segment['end'] == segment['start']:
            break
        else:
            filtered_segments = segments[:i+1]

    segments_to_add, segments_end, remaining_tokens, matched_sentences = find_best_segment_match([{
        "start": segment['start'],
        "end": segment['end'],
        "text": segment['text']
    } for segment in filtered_segments], tokens_texts)
    
    # Step 4: Print debug information
    print(f"Matched sentences: {matched_sentences}")
    print('===')
    print(f"Best match segment text: {segments_to_add}")
    print('===')
    print(f"Best match segment end: {segments_end}")
    # print(f"Best match: {best_match}")
    print('===')
    # print(best_match_segment)
    print(f"Remaining tokens: {remaining_tokens}")

    # raise ValueError("Stop")

    # Step 5: If there are no remaining tokens, return the initial matched segments
    if not remaining_tokens:
        return [{'start': segment['start'], 'end': segment['end'], 'text': segment['text']} for segment in segments]
    
    # Step 6: Determine starting point for the next segment and process remaining tokens
    start = segments_end
    remaining_tokens_joined = "\n\n".join(remaining_tokens)
    matched_sentences_joined = "\n\n".join(matched_sentences)

    # Step 7: Cut the audio file from the best match endpoint and save remaining tokens
    none_start = cut_audio_file(audio_file, None, start)
    with open(f"{none_start}-processed.txt", 'w') as file:
        file.write(matched_sentences_joined)
    trimmed_audio_file = cut_audio_file(audio_file, start, None)
    with open(f"{trimmed_audio_file}-remaining.txt", 'w') as file:
        file.write(remaining_tokens_joined)
    
    # Step 8: Recursively process remaining audio and tokens
    remaining_segments = get_segments_from_audio_file(trimmed_audio_file, remaining_tokens)

    # Step 9: Adjust the start and end times for the remaining segments and combine results
    aligned_segments = [{
        'start': segment['start'] + start,
        'end': segment['end'] + start,
        'text': segment['text']
    } for segment in remaining_segments]

    # Assuming corrected_segments is defined or meant to be the initially aligned segments
    return segments + aligned_segments

for segment in get_segments_from_audio_file(audio_file, tokens_texts):
    start = segment['start']
    end = segment['end']
    text = segment['text']
    print(f"{start} - {end}: {text}")
