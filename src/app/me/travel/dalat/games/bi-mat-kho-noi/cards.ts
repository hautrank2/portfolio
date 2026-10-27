export type SecretCard = { id: string; topic: string; icon: string; question: string };
const groups = [
  { topic: "Tình cảm", icon: "💘", questions: [
    "Có người nào bạn từng thích nhưng chưa một lần dám nói? Điều gì ngăn bạn lại? Không cần nêu tên.",
    "Bạn từng giữ liên lạc với ai chỉ vì sợ cảm giác cô đơn chưa?",
    "Trong một mối quan hệ, điều ích kỷ nhất bạn từng làm là gì?",
    "Có lời tỏ tình hoặc lời chia tay nào bạn ước mình đã nói khác đi không?",
    "Bạn từng giả vờ hết thích một người trong khi thực ra vẫn còn thích chưa?",
    "Bạn có từng ghen dù biết mình không có quyền ghen? Kể một lần.",
    "Điều gì ở bản thân khiến bạn khó tin rằng mình xứng đáng được yêu?",
    "Có red flag nào của người khác bạn từng bỏ qua vì quá thích họ?",
    "Bạn từng thích cảm giác được theo đuổi hơn là thích chính người đang theo đuổi mình chưa?",
    "Trong chuyện tình cảm, bạn sợ bị bỏ lại hay sợ bị nhìn thấy con người thật của mình hơn? Vì sao?",
  ] },
  { topic: "Giữa bạn bè", icon: "🫣", questions: [
    "Có lúc nào bạn thấy mình lạc lõng ngay cả khi ở cùng nhóm này không?",
    "Một điều bạn muốn nhóm hiểu về mình nhưng chưa từng biết mở lời thế nào?",
    "Bạn từng nhận lời đi chơi chỉ vì sợ bị bỏ lại, dù thật ra không muốn đi chưa?",
    "Một lần bạn chạnh lòng với bạn bè nhưng đã giả vờ không sao? Chỉ kể phần của mình.",
    "Bạn từng ghen tị với thành công của một người bạn chưa? Bạn đã xử lý cảm giác đó thế nào?",
    "Trong nhóm, bạn nghĩ mọi người hay hiểu sai điều gì về bạn?",
    "Bạn có từng muốn tạm rời một nhóm bạn nhưng không dám nói không?",
    "Có lời cảm ơn hoặc xin lỗi nào bạn còn nợ một người bạn không?",
    "Bạn có đang cố giữ hình ảnh nào trước mặt nhóm này không?",
    "Nếu được góp ý một điều cho cách cả nhóm đối xử với nhau, bạn muốn nói điều gì?",
  ] },
  { topic: "Chuyện giấu kín", icon: "🔐", questions: [
    "Một chuyện về bản thân bạn thường kể thiếu một phần để nghe đỡ quê là chuyện gì?",
    "Bạn từng nói dối về lý do mình khóc chưa? Lý do thật là gì?",
    "Một thói quen riêng mà bạn sẽ hơi hoảng nếu người khác vô tình biết?",
    "Bạn từng giả vờ hiểu một chuyện mình hoàn toàn không hiểu để khỏi mất mặt chưa?",
    "Một thứ bạn vẫn giữ dù luôn nói rằng mình đã buông bỏ?",
    "Bạn từng lén kiểm tra xem ai đó có xem bài đăng của mình không? Vì sao người đó quan trọng?",
    "Một lần bạn giả vờ đang rất ổn trong khi thực ra hoàn toàn ngược lại?",
    "Điều gì gần đây bạn đã né tránh nói với người thân? Không cần kể thông tin riêng của họ.",
    "Bạn từng nói mình không cần một thứ chỉ vì biết mình không thể có nó chưa?",
    "Có điều gì bạn luôn muốn thử nhưng sợ bị bạn bè đánh giá không?",
  ] },
  { topic: "Cái tôi", icon: "🪞", questions: [
    "Điều bạn thường chê ở người khác nhưng thật ra chính mình cũng có?",
    "Bạn từng cố tỏ ra giàu, giỏi hoặc từng trải hơn thực tế chưa? Kể một lần.",
    "Lời nhận xét nào từng làm bạn khó chịu vì nó có phần đúng?",
    "Một lỗi của bạn mà đến giờ vẫn hay được bạn giải thích bằng hoàn cảnh?",
    "Bạn có từng muốn người khác thất bại để mình cảm thấy đỡ thua kém không?",
    "Bạn sợ bị xem là người bình thường ở điểm nào nhất?",
    "Có lúc nào bạn xin lỗi chỉ để kết thúc tranh cãi chứ chưa thấy mình sai?",
    "Bạn thường tìm sự công nhận từ ai nhất? Vì sao?",
    "Bạn nghĩ mình khó ở nhất khi nào, và người khác phải chịu điều đó ra sao?",
    "Nếu bỏ hết những thứ dùng để gây ấn tượng, bạn tự hào nhất về điều gì ở mình?",
  ] },
  { topic: "Điều còn tiếc", icon: "🥀", questions: [
    "Một cơ hội bạn bỏ lỡ chỉ vì không đủ can đảm?",
    "Có ai bạn đã để mất liên lạc dù thật ra vẫn muốn giữ bên mình không?",
    "Một lời nói của bạn từng làm người khác buồn mà đến giờ bạn còn nhớ?",
    "Nếu được sửa một quyết định trong năm vừa qua, bạn sửa điều gì?",
    "Có chuyện gì bạn đã trì hoãn đến mức không còn cơ hội làm nữa không?",
    "Bạn đã từng chọn im lặng dù biết mình nên đứng ra nói điều gì đó chưa?",
    "Một lần bạn làm ai đó thất vọng nhưng chưa thực sự nhận trách nhiệm?",
    "Bạn có đang nhớ một phiên bản cũ của chính mình không? Phiên bản đó có gì?",
    "Một lời xin lỗi bạn muốn nhận nhưng có lẽ sẽ không bao giờ nhận được? Không cần gọi tên ai.",
    "Điều gì bạn từng đánh đổi để được chấp nhận, nhưng giờ thấy không đáng?",
  ] },
  { topic: "Nỗi sợ & ước muốn", icon: "🌙", questions: [
    "Điều bạn lo nhất về tương lai nhưng thường nói đùa cho nhẹ đi?",
    "Bạn có đang theo đuổi mục tiêu nào chủ yếu vì kỳ vọng của người khác không?",
    "Nếu không sợ bị đánh giá, bạn muốn thay đổi điều gì trong cuộc sống ngay lúc này?",
    "Bạn sợ người thân thất vọng về điều gì ở mình nhất?",
    "Một ước mơ bạn đã bỏ vào ngăn kéo nhưng thật ra chưa hết muốn?",
    "Bạn muốn được người khác nhớ đến vì điều gì, và hiện tại đã sống giống vậy chưa?",
    "Điều gì khiến bạn cảm thấy mình đang chậm hơn mọi người?",
    "Bạn đang cần sự giúp đỡ ở chuyện gì nhưng vẫn cố tự xoay xở?",
    "Điều gì bạn muốn nói với chính mình một năm trước nhưng chưa dám thừa nhận với ai?",
    "Nếu được nhờ cả nhóm giúp đúng một chuyện sau tối nay, bạn sẽ nhờ điều gì?",
  ] },
];
export const secretCards: SecretCard[] = groups.flatMap((group, groupIndex) => group.questions.map((question, index) => ({ id: `secret-${groupIndex}-${index}`, topic: group.topic, icon: group.icon, question })));
export function shuffleSecrets(): SecretCard[] {
  const deck = [...secretCards];
  for (let index = deck.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  return deck;
}
