from alignment import calculate_similarity_ratio

def get_processed_and_remaining_sentences(sentences_texts, corrected_segments):
    """
    Get the processed and remaining sentences, given the corrected segments and sentences.
    Find the best match segment in `corrected_segments` for `sentences_texts`.
    """
    highest_ratio = 0
    best_match = None
    for segment in corrected_segments:
        for sentence in sentences_texts:
            ratio = calculate_similarity_ratio(segment, sentence)
            if ratio > highest_ratio:
                highest_ratio = ratio
                best_match = segment
    return best_match, sentences_texts[sentences_texts.index(best_match) + 1:]