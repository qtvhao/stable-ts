import pytest
from alignutils import calculate_similarity_ratio, find_best_segment_match
from hypothesis import given, strategies as st

@pytest.mark.parametrize("segment_text, candidate_text, expected_ratio", [
    (
        "This is a test segment with exactly ten words here.", 
        "Completely different text with no matching words. This is a test segment with, exactly  ten  words  here.", 
        0.99
    ),
    ("Short text.", "Short text.", 1.0),
    ("Short text.", "Different text.", 0.61),
    ("", "", 0.0),
    ("", "Non-empty text.", 0.0),
    ("Non-empty text.", "", 0.0)
])
def test_calculate_similarity_ratio(segment_text, candidate_text, expected_ratio):
    ratio = calculate_similarity_ratio(segment_text, candidate_text)
    assert ratio == pytest.approx(expected_ratio, rel=1e-2), f"Expected {expected_ratio}, but got {ratio}"
# 

@pytest.mark.parametrize("segments, sentences_texts, expected_matched_segments, expected_matched_segment_end, expected_remaining_sentences, expected_processed_sentences", [
    (
        [{"text": "This is a test segment.", "start": 5, "end": 10}, {"text": "Another segment here.", "start": 12, "end": 20}],
        ["This is a test segment.", "Completely different sentence."],
        [{"text": "This is a test segment.", "start": 5, "end": 10}],
        10,
        ["Completely different sentence."],
        ["This is a test segment."]
    ),
    (
        [{"text": "Short segment.", "start": 3, "end": 5}, {"text": "Another short segment.", "start": 8, "end": 15}],
        ["Short segment.", "Another short segment."],
        [{"text": "Short segment.", "start": 3, "end": 5}, {"text": "Another short segment.", "start": 8, "end": 15}],
        15,
        [],
        ["Short segment.", "Another short segment."]
    ),
    (
        [{"text": "Short segment.", "start": 3, "end": 6}, {"text": "Another short segment.", "start": 8, "end": 15}],
        ["Short segment.", "Another short segment.", "Third short segment."],
        [{"text": "Short segment.", "start": 3, "end": 6}, {"text": "Another short segment.", "start": 8, "end": 15}],
        15,
        ["Third short segment."], 
        ["Short segment.", "Another short segment."]
    ),
    (
        [{"text": "Segment one.", "start": 3, "end": 5}, {"text": "Segment two.", "start": 8, "end": 10}],
        ["No match here.", "Another non-matching sentence."],
        None,
        None,
        ["No match here.", "Another non-matching sentence."],
        []
    ),
    (
        [{'start': 0.0, 'end': 1.02, 'text': ' 4.'}, {'start': 1.44, 'end': 4.3, 'text': ' Hình thức thi và đánh giá  Các kỳ thi của CompTIA được tổ chức theo tiêu chuẩn quốc tế,'}, {'start': 4.38, 'end': 7.7, 'text': ' với hình thức câu hỏi đa lựa chọn,'}, {'start': 7.7, 'end': 7.8, 'text': ' bài thực hành mô phỏng (performance-based),'}, {'start': 7.8, 'end': 7.8, 'text': ' và bài kiểm tra kỹ năng thực tế.'}, {'start': 7.8, 'end': 7.8, 'text': ' Thí sinh có thể đăng ký và tham gia thi trực tuyến hoặc tại các trung tâm thi được CompTIA ủy quyền.'}, {'start': 7.8, 'end': 7.8, 'text': '  5.'}, {'start': 7.8, 'end': 8.12, 'text': ' Tầm quan trọng trong ngành CNTT'}, {'start': 9.41, 'end': 9.41, 'text': ' CNTT  Với uy tín và chất lượng đào tạo,'}, {'start': 9.41, 'end': 9.41, 'text': ' CompTIA đóng góp rất lớn trong việc chuẩn hóa kiến thức và kỹ năng cho những người làm việc trong ngành CNTT.'}, {'start': 9.41, 'end': 9.41, 'text': ' Các chứng chỉ của CompTIA không chỉ giúp cá nhân phát triển sự nghiệp mà còn hỗ trợ doanh nghiệp trong việc duy trì một lực lượng lao động CNTT chuyên nghiệp và đủ năng lực.'}, {'start': 9.41, 'end': 9.41, 'text': '  Tóm lại,'}, {'start': 9.41, 'end': 9.41, 'text': ' CompTIA là một tổ chức hàng đầu với mục tiêu nâng cao chuẩn mực và chất lượng nguồn nhân lực CNTT toàn cầu.'}, {'start': 9.41, 'end': 9.41, 'text': ' Các chứng chỉ của CompTIA giúp trang bị kiến thức chuyên sâu,'}, {'start': 9.41, 'end': 9.41, 'text': ' kỹ năng thực tiễn,'}, {'start': 9.41, 'end': 9.41, 'text': ' đồng thời mở rộng cơ hội cho người làm việc trong ngành công nghệ.'}],
        ['4. Hình thức thi và đánh giá', 'Các kỳ thi của CompTIA được tổ chức theo tiêu chuẩn quốc tế, với hình thức câu hỏi đa lựa chọn, bài thực hành mô phỏng (performance-based), và bài kiểm tra kỹ năng thực tế. Thí sinh có thể đăng ký và tham gia thi trực tuyến hoặc tại các trung tâm thi được CompTIA ủy quyền.', '5. Tầm quan trọng trong ngành CNTT', 'Với uy tín và chất lượng đào tạo, CompTIA đóng góp rất lớn trong việc chuẩn hóa kiến thức và kỹ năng cho những người làm việc trong ngành CNTT. Các chứng chỉ của CompTIA không chỉ giúp cá nhân phát triển sự nghiệp mà còn hỗ trợ doanh nghiệp trong việc duy trì một lực lượng lao động CNTT chuyên nghiệp và đủ năng lực.', 'Tóm lại, CompTIA là một tổ chức hàng đầu với mục tiêu nâng cao chuẩn mực và chất lượng nguồn nhân lực CNTT toàn cầu. Các chứng chỉ của CompTIA giúp trang bị kiến thức chuyên sâu, kỹ năng thực tiễn, đồng thời mở rộng cơ hội cho người làm việc trong ngành công nghệ.'],
        None,
        None,
        [],
        []
    )
])
def test_find_best_segment_match(segments, sentences_texts, expected_matched_segments, expected_matched_segment_end, expected_remaining_sentences, expected_processed_sentences):
    matched_segments, matched_segment_end, remaining_sentences, processed_sentences = find_best_segment_match(segments, sentences_texts)
    assert matched_segments == expected_matched_segments, f"Expected {expected_matched_segments}, but got {matched_segments}"
    assert matched_segment_end == expected_matched_segment_end, f"Expected {expected_matched_segment_end}, but got {matched_segment_end}"
    assert remaining_sentences == expected_remaining_sentences, f"Expected {expected_remaining_sentences}, but got {remaining_sentences}"
    assert processed_sentences == expected_processed_sentences, f"Expected {expected_processed_sentences}, but got {processed_sentences}"

# 
@given(st.text(), st.text())
def test_calculate_similarity_ratio_2(segment_text, candidate_text):
    ratio = calculate_similarity_ratio(segment_text, candidate_text)
    assert 0.0 <= ratio <= 1.0, "The similarity ratio should be between 0 and 1"

def test_calculate_similarity_ratio_exact_match():
    segment_text = "This is a test segment with exactly ten words here."
    candidate_text = "This is a test segment with exactly ten words here."
    ratio = calculate_similarity_ratio(segment_text, candidate_text)
    assert ratio == 1.0, "The similarity ratio should be 1.0 for exact matches"
