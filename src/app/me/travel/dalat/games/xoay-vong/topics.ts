export const roundTopics = [
  { id: "thanh-pho", icon: "🏙️", name: "Thành phố ở Việt Nam", rule: "Mỗi lượt nói tên một thành phố ở Việt Nam. Có thể dùng tên quen thuộc trước sắp xếp hành chính nếu cả nhóm thống nhất." },
  { id: "trai-cay", icon: "🍉", name: "Các loại trái cây", rule: "Mỗi lượt nói tên một loại trái cây. Khác giống nhưng cùng một loại không tính là đáp án mới." },
  { id: "ca-si", icon: "🎤", name: "Ca sĩ Việt Nam", rule: "Mỗi lượt gọi tên một ca sĩ Việt Nam. Tên thật và nghệ danh của cùng một người chỉ tính một lần." },
  { id: "bai-hat", icon: "🎵", name: "Tên bài hát Việt", rule: "Mỗi lượt nói tên một bài hát Việt Nam. Cả nhóm xác nhận bài hát có thật; không cần hát." },
  { id: "mon-viet", icon: "🍜", name: "Món ăn Việt Nam", rule: "Mỗi lượt gọi tên một món ăn Việt. Không đổi mỗi tên quán để tính thành món mới." },
  { id: "dong-vat", icon: "🦒", name: "Tên động vật", rule: "Mỗi lượt nói tên một loài động vật. Cách gọi khác của cùng một loài không tính là mới." },
  { id: "quoc-gia", icon: "🌍", name: "Tên quốc gia", rule: "Mỗi lượt nói tên một quốc gia. Tên tiếng Việt và tiếng Anh của cùng một nước chỉ tính một lần." },
  { id: "thuong-hieu", icon: "🏷️", name: "Thương hiệu nổi tiếng", rule: "Mỗi lượt nói tên một thương hiệu có thật. Được dùng thương hiệu Việt hoặc nước ngoài." },
  { id: "do-uong", icon: "🧋", name: "Các loại đồ uống", rule: "Mỗi lượt nói tên một loại đồ uống. Không thêm kích cỡ hoặc tên quán để tạo đáp án mới." },
  { id: "rau-cu", icon: "🥕", name: "Các loại rau củ", rule: "Mỗi lượt gọi tên một loại rau hoặc củ thường dùng làm thực phẩm." },
  { id: "my-pham", icon: "💄", name: "Đồ trang điểm", rule: "Mỗi lượt nói tên một loại sản phẩm hoặc dụng cụ trang điểm. Không chỉ đổi tên hãng." },
  { id: "cau-thu", icon: "⚽", name: "Cầu thủ bóng đá", rule: "Mỗi lượt gọi tên một cầu thủ bóng đá, đang thi đấu hay đã giải nghệ đều được." },
  { id: "da-lat", icon: "🌲", name: "Địa điểm ở Đà Lạt", rule: "Mỗi lượt kể một địa điểm tham quan, quán hoặc nơi có thật tại Đà Lạt và vùng lân cận. Cả nhóm cùng xác nhận." },
  { id: "phim", icon: "🎬", name: "Tên phim", rule: "Mỗi lượt nói tên một bộ phim điện ảnh hoặc phim bộ. Tên dịch và tên gốc cùng phim chỉ tính một lần." },
  { id: "hoat-hinh", icon: "🧸", name: "Nhân vật hoạt hình", rule: "Mỗi lượt gọi tên một nhân vật hoạt hình hoặc anime. Biệt danh cùng nhân vật không tính là mới." },
  { id: "do-bep", icon: "🍳", name: "Đồ trong nhà bếp", rule: "Mỗi lượt nói một đồ vật thường có trong bếp. Không đổi màu hoặc kích thước để tạo đáp án mới." },
  { id: "nghe", icon: "🧑‍🍳", name: "Tên nghề nghiệp", rule: "Mỗi lượt nói tên một nghề. Các cách gọi tương đương của cùng nghề chỉ tính một lần." },
  { id: "hoa", icon: "🌻", name: "Các loài hoa", rule: "Mỗi lượt gọi tên một loài hoa. Không chỉ thêm màu để biến thành đáp án mới." },
  { id: "ung-dung", icon: "📱", name: "Ứng dụng điện thoại", rule: "Mỗi lượt nói tên một ứng dụng có thật. Không cần mở điện thoại để chứng minh." },
  { id: "the-thao", icon: "🏸", name: "Các môn thể thao", rule: "Mỗi lượt kể tên một môn thể thao. Không dùng hai cách gọi cho cùng một môn." },
  { id: "banh", icon: "🍰", name: "Các loại bánh", rule: "Mỗi lượt nói tên một loại bánh. Không chỉ đổi tên tiệm bán bánh." },
  { id: "du-lich", icon: "🧳", name: "Đồ mang đi du lịch", rule: "Mỗi lượt gọi tên một đồ vật bạn có thể mang trong hành lý. Không đổi nhãn hiệu để tính là mới." },
  { id: "nhac-cu", icon: "🎸", name: "Tên nhạc cụ", rule: "Mỗi lượt nói tên một nhạc cụ. Tên tiếng Việt và tiếng nước ngoài của cùng nhạc cụ chỉ tính một lần." },
  { id: "tinh-tu", icon: "😎", name: "Từ miêu tả tính cách", rule: "Mỗi lượt nói một từ hoặc cụm từ chỉ tính cách con người. Không dùng phủ định của từ vừa nói để lách luật." },
] as const;
export type RoundTopic = (typeof roundTopics)[number];
export function shuffleTopics(): RoundTopic[] {
  const topics: RoundTopic[] = [...roundTopics];
  for (let i = topics.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [topics[i], topics[j]] = [topics[j], topics[i]];
  }
  return topics;
}
export function normalizeAnswer(answer: string) {
  return answer.trim().toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
