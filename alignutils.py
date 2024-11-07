from difflib import SequenceMatcher

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

def calculate_similarity_ratio(segment_text, candidate_text):
    """
    Calculate the similarity ratio between the last 10 words of two strings.
    
    Args:
        segment_text (str): The text from corrected segments.
        candidate_text (str): The text from tokens.
        
    Returns:
        float: The similarity ratio between the last 10 words of the two strings.
    """
    segment_words = segment_text.split()[-10:]
    candidate_words = candidate_text.split()[-10:]
    segment_last_10 = ' '.join(segment_words)
    candidate_last_10 = ' '.join(candidate_words)
    return SequenceMatcher(None, segment_last_10, candidate_last_10).ratio()

def find_best_segment_match(segments, sentences_texts):
    """
    Find the best match segment in `corrected_segments` for `sentences_texts`.
    
    Args:
        corrected_segments (list of dict): List of dictionaries containing 'text' from corrected segments.
        sentences_texts (list of str): List of strings, each representing a sentence.
        
    Returns:
        dict: The best matching segment.
    """
    highest_ratio = 0
    best_match = None
    for segment in segments:
        for sentence in sentences_texts:
            ratio = calculate_similarity_ratio(segment['text'], sentence)
            if ratio > highest_ratio:
                highest_ratio = ratio
                best_match = segment
    return best_match