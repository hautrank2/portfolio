"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Dices, LockKeyhole, RotateCcw, Sparkles, Trophy, X } from "lucide-react";
import { ThemeToggle } from "~/components/layouts/theme-toggle";
import { tripFont } from "../../trip-font";
import tripStyles from "../../trip.module.css";
import { drawQuestions, questions } from "./questions";
import styles from "./cards.module.css";

const icons = [
  { symbol: "💩", name: "Cục cưng", tease: "Thơm hay không tùy đáp án" },
  { symbol: "🩲", name: "Quần chíp", tease: "Sai thì đội lên đầu… tưởng tượng" },
  { symbol: "🪠", name: "Thông bồn", tease: "Thông não trước khi thông cống" },
  { symbol: "🚽", name: "Ngai vàng", tease: "Nơi ý tưởng lớn ra đời" },
  { symbol: "🍑", name: "Mông đào", tease: "Đừng để bị quê cả cục" },
  { symbol: "🤡", name: "Hề chúa", tease: "Tự tin lên, quê cùng nhau" },
  { symbol: "🧻", name: "Giấy cứu tinh", tease: "Kiến thức có thể thiếu, giấy thì không" },
  { symbol: "🦨", name: "Chồn thối", tease: "Ai xì thì tự nhận nha" },
  { symbol: "🥒", name: "Dưa leo", tease: "Đầu óc trong sáng lên nào" },
];
const penalties = ["Hát một đoạn điệp khúc do cả nhóm chọn.", "Tạo 3 dáng chụp ảnh hài hước cho nhóm.", "Nói một lời khen thật lòng với từng người.", "Bắt chước tiếng một con vật để nhóm đoán.", "Kể một kỷ niệm quê nhẹ của bản thân.", "Làm MC giới thiệu từng thành viên trong 30 giây.", "Nhảy tự do 15 giây theo nhạc của nhóm.", "Đọc một câu bất kỳ bằng giọng robot.", "Đặt biệt danh vui cho mình trong tối nay."];
type Result = { card: number; player: number; correct: boolean };

export default function CardGame() {
  const [names, setNames] = useState(["Bạn 1", "Bạn 2", "Bạn 3"]);
  const [started, setStarted] = useState(false);
  const [deck, setDeck] = useState<number[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const cardButtons = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    // Draw after hydration so every visit gets a fresh hand without a server/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeck(drawQuestions());
  }, []);
  const currentResult = results.find(result => result.card === active);
  const player = currentResult?.player ?? results.length % names.length;
  const question = active === null ? null : questions[deck[active]];
  const finished = results.length === 9 && active === null;
  const scores = names.map((_, index) => results.filter(result => result.player === index && result.correct).length);
  function start() {
    setNames(names.map((name, index) => name.trim() || `Bạn ${index + 1}`));
    setResults([]); setActive(null); setRevealed(false); setStarted(true);
  }
  function grade(correct: boolean) {
    if (!revealed || active === null || currentResult) return;
    setResults(previous => previous.some(result => result.card === active) ? previous : [...previous, { card: active, player, correct }]);
  }
  function next() {
    setDialogOpen(false); setActive(null); setRevealed(false);
  }
  function replay() {
    setDeck(drawQuestions()); setResults([]); setActive(null); setRevealed(false); setStarted(false);
  }
  return (
    <div className={`${tripStyles.trip} ${tripFont.variable}`} lang="vi">
      <header className={`dalat-header ${styles.header}`}><Link href="/me/travel/dalat/games"><ArrowLeft size={17} /> Về các trò chơi</Link><ThemeToggle className="dalat-theme-toggle" /></header>
      <main className={`${styles.main} ${started ? styles.playing : ""}`}>
        <div className={styles.hero}><p className={styles.eyebrow}><Sparkles size={14} /> BIẾT THÌ THƯA · KHÔNG BIẾT THÌ… ĐOÁN</p><h1>Chọn một lá.<br /><em>Đừng chọn… quê!</em></h1><p>{questions.length} câu hỏi · 9 lá bài · một hội bạn không chịu thua.<br />Showbiz, đố mẹo, bựa hết nấc & chút kiến thức dễ. Tự tin quá coi chừng dính bẫy!</p></div>
        <div className={styles.topics}><span>🎤 Showbiz</span><span>🧠 Đố mẹo</span><span>💩 Bựa hết nấc</span><span>🏯 Lịch sử dễ</span><span>🌏 Địa lý dễ</span></div>
        {!started ? <section className={styles.setup} aria-label="Thiết lập người chơi"><h2><Dices size={22} /> Hội mình có những ai?</h2><p>3 người · mỗi người 3 lượt. Đúng +1 điểm, sai nhận phạt ngay.</p><div className={styles.names}>{names.map((name, index) => <label key={index}>Người chơi {index + 1}<input value={name} maxLength={24} onChange={event => setNames(names.map((old, i) => i === index ? event.target.value : old))} /></label>)}</div><button className={styles.primary} onClick={start} disabled={deck.length !== 9}>Chơi thôi <ArrowRight size={17} /></button></section> : <section className={styles.gameInfo} aria-label="Điểm và lượt chơi">
          <div className={styles.scoreboard}>{names.map((name, index) => <div key={index} className={!finished && index === player ? styles.current : ""}><span>{name}</span><strong>{scores[index]} <small>điểm</small></strong><small>{results.filter(result => result.player === index && !result.correct).length} lần nhận phạt</small></div>)}</div>
          <div className={styles.turn} aria-live="polite"><span>{finished ? "ĐÃ MỞ HẾT 9 LÁ" : `LƯỢT ${Math.min(results.length + (currentResult ? 0 : 1), 9)} / 9`}</span><h2>{finished ? "Cả hội đã hoàn thành!" : `${names[player]}, ${active === null ? "chọn một lá nhé!" : "tới bạn trả lời!"}`}</h2>{active !== null && !dialogOpen && <button className={styles.primary} onClick={() => setDialogOpen(true)}>Mở lại câu hỏi đang chơi</button>}</div>
        </section>}
        <div className={styles.board} aria-label="9 lá bài câu hỏi">{icons.map((icon, index) => {
          const result = results.find(item => item.card === index);
          const isActive = active === index;
          const locked = !started || (active !== null && !isActive && !result);
          const disabled = !isActive && (locked || !!result || finished);
          const status = isActive ? "Đang chơi" : result ? (result.correct ? "Đã đúng" : "Đã sai") : !started ? "Chưa bắt đầu" : locked ? "Đang khóa" : "Chọn lá này";
          return <button
            ref={element => { cardButtons.current[index] = element; }} key={index}
            className={`${styles.card} ${isActive ? styles.selected : ""} ${result && !isActive ? styles.used : ""} ${result && !isActive ? (result.correct ? styles.won : styles.lost) : ""} ${locked ? styles.locked : ""}`}
            disabled={disabled} aria-pressed={isActive}
            onClick={() => { if (!isActive) { setActive(index); setRevealed(false); } setDialogOpen(true); }}
            aria-label={`Lá ${icon.name}, ${status}`}>
            <span className={styles.number}>0{index + 1}</span>
            <span className={styles.stateBadge}>{isActive ? <Sparkles size={14} /> : result ? (result.correct ? <Check size={14} /> : <X size={14} />) : locked ? <LockKeyhole size={14} /> : null}{status}</span>
            <span className={styles.symbol} aria-hidden="true">{icon.symbol}</span>
            <strong className={styles.cardName}>{icon.name}</strong>
            <span className={styles.cardTease}>{isActive ? "Bấm để mở lại câu hỏi" : result ? names[result.player] + (result.correct ? " · +1 điểm" : " · nhận phạt") : locked ? (started ? "Chờ xong lượt này nhé" : "Nhập tên rồi chơi thôi") : icon.tease}</span>
          </button>;
        })}</div>
        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className={styles.overlay} />
            <Dialog.Content lang="vi" className={`${tripStyles.trip} ${tripFont.variable} ${styles.modal}`} onCloseAutoFocus={event => { event.preventDefault(); const nextCard = active !== null ? active : icons.findIndex((_, index) => !results.some(result => result.card === index)); cardButtons.current[nextCard]?.focus(); }}>
              {question && active !== null && <>
                <p className={styles.eyebrow}>{icons[active].symbol} {icons[active].name} · {question[0]} · {names[player]}</p>
                <Dialog.Title className={styles.questionTitle}>{question[1]}</Dialog.Title>
                <Dialog.Description className={styles.description}>Trả lời thành tiếng trước khi mở đáp án. Cả nhóm cùng chấm; đáp án khác hợp lý vẫn được tính nhé.</Dialog.Description>
                {!revealed ? <button className={styles.primary} onClick={() => setRevealed(true)}>Hiện đáp án <ArrowRight size={17} /></button> : <>
                  <div className={styles.answer} aria-live="polite"><small>ĐÁP ÁN</small><strong>{question[2]}</strong></div>
                  {!currentResult ? <div className={styles.gradeButtons}><button className={styles.primary} onClick={() => grade(true)}><Check size={18} /> Đúng</button><button className={styles.wrong} onClick={() => grade(false)}><X size={18} /> Sai</button></div> : <div className={styles.feedback} aria-live="polite"><h3>{currentResult.correct ? "Kiến thức này không làm khó được tui! +1 🎉" : "Tự tin là tốt. Đúng nữa thì tốt hơn 😆"}</h3>{!currentResult.correct && <div className={styles.penalty}><strong>Thử thách của bạn</strong><p>{penalties[active]}</p><small>Ngại quá thì đổi sang kể một chuyện vui. Cả hội đồng ý là được!</small></div>}<button className={styles.primary} onClick={next}>{results.length === 9 ? "Xem kết quả" : "Xong rồi, người tiếp theo"}<ArrowRight size={17} /></button></div>}
                </>}
              </>}
              <Dialog.Close className={styles.close} aria-label="Đóng câu hỏi"><X size={20} /></Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        {finished && <section className={styles.setup} aria-live="polite"><Trophy size={32} /><h2>{names.filter((_, index) => scores[index] === Math.max(...scores)).join(" & ")} thắng với {Math.max(...scores)} điểm!</h2><p>Ai trả lời sai đã nhận thử thách ở lượt của mình. Giờ chụp một tấm ảnh kỷ niệm nào!</p><button className={styles.primary} onClick={replay}><RotateCcw size={17} /> Bốc 9 câu mới / chơi lại</button></section>}
        <p className={styles.note}>Mỗi lần vào là một bộ câu hỏi ngẫu nhiên · Mỗi lá chỉ chấm một lần · Phạt vui, cả nhóm cùng đồng ý</p>
      </main>
    </div>
  );
}
