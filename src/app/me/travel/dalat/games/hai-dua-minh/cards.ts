export type CoupleKind = "guess" | "share" | "dare";
export type CoupleCard = { id: string; kind: CoupleKind; text: string };
export const coupleKinds = {
  guess: { icon: "💭", name: "Hiểu nhau đến đâu?", hint: "Bạn đoán trước, rồi người yêu bật mí đáp án của mình." },
  share: { icon: "💌", name: "Chuyện hai đứa", hint: "Người tới lượt chia sẻ, người còn lại lắng nghe rồi có thể kể thêm." },
  dare: { icon: "💞", name: "Thử thách tình yêu", hint: "Người tới lượt thực hiện; nếu cần bạn diễn thì cả hai cùng đồng ý nhé." },
} as const;
const guesses = [
  "Nếu ngay bây giờ được ăn một món, {partner} sẽ chọn món gì?",
  "Khi buồn, {partner} muốn được ôm, được nghe tâm sự hay có không gian riêng?",
  "Một món ăn {partner} không thích là gì?",
  "{partner} thích hẹn hò ở nhà, quán cà phê hay đi khám phá một nơi mới hơn?",
  "Kỷ niệm nào của hai đứa mà {partner} nhớ nhất?",
  "Nếu có một ngày nghỉ hoàn toàn, {partner} sẽ làm gì đầu tiên?",
  "Một bài hát {partner} thường nghe gần đây là bài nào?",
  "{partner} thích quà bất ngờ hay được hỏi trước món mình muốn?",
  "Điều nhỏ nào bạn làm khiến {partner} thấy được yêu thương nhất?",
  "{partner} thích biển hay núi hơn?",
  "Một địa điểm {partner} muốn hai đứa cùng đi là ở đâu?",
  "Khi hai đứa giận nhau, {partner} muốn làm lành bằng cách nào?",
  "Một thói quen của bạn mà {partner} thấy dễ thương là gì?",
  "Nếu chọn một bộ phim xem cùng tối nay, {partner} sẽ chọn thể loại nào?",
  "{partner} thích chụp ảnh cho người yêu hay được người yêu chụp hơn?",
  "Đồ uống {partner} hay gọi nhất là gì?",
];
const shares = [
  "Khoảnh khắc nào khiến bạn nhận ra mình có tình cảm với {partner}?",
  "Ấn tượng đầu tiên của bạn về {partner} khác hiện tại như thế nào?",
  "Một điều nhỏ {partner} làm mà bạn nhớ rất lâu?",
  "Có lời cảm ơn nào bạn muốn nói với {partner} nhưng thường ngại không?",
  "Một điều bạn mong hai đứa làm nhiều hơn trong thời gian tới?",
  "Khi nào ở cạnh {partner} bạn thấy an tâm nhất?",
  "Một chuyện về bản thân bạn muốn {partner} hiểu hơn?",
  "Một lần bạn đã giận nhưng chưa nói rõ lý do của mình? Kể bằng cảm xúc của bạn nhé.",
  "Một điều bạn từng ngại chia sẻ vì sợ {partner} hiểu lầm?",
  "Bạn nghĩ hai đứa đã thay đổi tích cực thế nào từ khi yêu nhau?",
  "Một kiểu quan tâm bạn rất thích nhưng ít khi chủ động xin?",
  "Có lời xin lỗi nào bạn muốn nói với {partner} ngay lúc này không?",
  "Nếu được sống lại một buổi hẹn, bạn chọn buổi nào?",
  "Một giới hạn riêng bạn muốn hai đứa tôn trọng hơn?",
  "Bạn muốn giữ thói quen nào của hai đứa dù sau này bận đến đâu?",
  "Điều gì khiến bạn vẫn chọn ở bên {partner} mỗi ngày?",
];
const dares = [
  "Nói 3 điều bạn thích ở {partner}, không nhắc đến ngoại hình.",
  "Nhìn vào mắt {partner} 15 giây nếu cả hai thoải mái, rồi nói điều đầu tiên bạn nghĩ tới.",
  "Mời {partner} nắm tay hoặc ôm 10 giây. Nếu không muốn đụng chạm, gửi một trái tim bằng tay.",
  "Tỏ tình lại với {partner} bằng một câu có đủ ba từ: Đà Lạt, định mệnh, bánh mì.",
  "Hát một câu hoặc tự nghĩ một câu hát dành riêng cho {partner}.",
  "Diễn lại biểu cảm của bạn lúc chuẩn bị cho buổi hẹn đầu tiên.",
  "Mô tả {partner} như một nhân vật chính trong bộ phim tình cảm.",
  "Tặng {partner} một biệt danh mới và giải thích ý nghĩa thật dễ thương của nó.",
  "Lên ý tưởng một buổi hẹn chỉ với 100.000đ, kể đủ ăn gì và làm gì.",
  "Nói một lời khen với {partner} bằng giọng dẫn chương trình trao giải.",
  "Cùng {partner} tạo một kiểu chào bí mật chỉ hai đứa biết.",
  "Kể câu chuyện hai đứa gặp nhau bằng phong cách trailer phim.",
  "Nói một câu thả thính cực sến với {partner}, cố giữ mặt nghiêm túc.",
  "Chọn một hành động quan tâm nhỏ bạn sẽ làm cho {partner} ngày mai.",
  "Cùng {partner} tạo dáng một tấm ảnh tưởng tượng. Chụp thật nếu cả hai cùng muốn.",
  "Đặt tên cho chuyến đi này như tên một album tình yêu của hai đứa.",
];
export const coupleCards: CoupleCard[] = [
  ...guesses.map((text, index) => ({ id: `guess-${index}`, kind: "guess" as const, text })),
  ...shares.map((text, index) => ({ id: `share-${index}`, kind: "share" as const, text })),
  ...dares.map((text, index) => ({ id: `dare-${index}`, kind: "dare" as const, text })),
];
export function drawCoupleCards(count: number): CoupleCard[] {
  const cards = [...coupleCards];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards.slice(0, Math.max(0, count));
}
export function formatCouplePrompt(text: string, partner: string) {
  return text.replaceAll("{partner}", () => partner);
}
