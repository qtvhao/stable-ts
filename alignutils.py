from sentence_operations import split_sentences_by_highest_similarity_to_segments
from utils import calculate_similarity_ratio

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

def get_valid_segments(segments):
    for i, segment in enumerate(segments):
        if segment['end'] == segment['start']:
            print(f"Segment {i} has no text")

            return valid_segments
        else:
            print(f"Segment {i}: {segment['text']}")
            valid_segments = segments[:i]
    return segments

def find_best_segment_match(segments, sentences_texts):
    """
    Tìm segments tối đa, mà segments đó có độ tương đồng cao nhất với sentences_texts.
    """
    segments = get_valid_segments(segments)
    processed_sentences, remaining_sentences = split_sentences_by_highest_similarity_to_segments(sentences_texts, segments)
    highest_ratio = 0
    matched_segments = None
    matched_segment_end = None
    for i, segment in enumerate(segments):
        for sentence in processed_sentences:
            ratio = calculate_similarity_ratio(segment['text'], sentence)
            if ratio >= highest_ratio:
                highest_ratio = ratio
                matched_segments = segments[:i+1]
                if len(matched_segments) == len(segments):
                    matched_segment_end = None
                else:
                    matched_segment_end = matched_segments[-1]['end']

    return matched_segments, matched_segment_end, remaining_sentences, processed_sentences
