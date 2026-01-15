export interface AvatarClickMessage {
  text: string;
  emotion: 'normal' | 'happy' | 'sad' | 'thinking';
}

export const avatarClickMessages: AvatarClickMessage[] = [
  { text: '今日も頑張ろうワン！💪', emotion: 'happy' },
  { text: '何か手伝うことある？🤔', emotion: 'thinking' },
  { text: 'お腹すいたワン...🍖', emotion: 'sad' },
  { text: '店長、大好きだワン！❤️', emotion: 'happy' },
  { text: 'わんわん！元気いっぱいだワン！', emotion: 'happy' },
  { text: '今日の売上、気になるワン...📊', emotion: 'thinking' },
  { text: 'お散歩行きたいワン〜🐾', emotion: 'normal' },
  { text: 'クンクン...いい匂いがするワン！', emotion: 'thinking' },
  { text: '褒めてほしいワン！✨', emotion: 'happy' },
  { text: 'もっと遊んでワン！🎾', emotion: 'happy' },
  { text: '眠くなってきたワン...💤', emotion: 'sad' },
  { text: 'ご褒美のおやつはまだワン？🍪', emotion: 'thinking' },
  { text: 'ビシッと決めるワン！💼', emotion: 'normal' },
  { text: '一緒にがんばるワン！', emotion: 'happy' },
  { text: 'ワンワン！呼んだワン？', emotion: 'normal' },
  { text: 'いつでも味方だワン！🛡️', emotion: 'happy' },
  { text: 'お店の番、任せるワン！', emotion: 'thinking' },
  { text: '今日もいい天気ワン☀️', emotion: 'happy' },
  { text: 'ちょっと休憩するワン？☕', emotion: 'normal' },
  { text: 'データ分析、得意ワン！📈', emotion: 'thinking' },
  { text: '目標達成するワン！🎯', emotion: 'happy' },
  { text: 'ファイトだワン！💪✨', emotion: 'happy' },
  { text: 'なでなでしてほしいワン...', emotion: 'sad' },
  { text: 'キラキラしてるワン！✨', emotion: 'happy' },
  { text: 'もっと仲良くなりたいワン！', emotion: 'happy' },
  { text: '質問があれば僕を1秒以上長押ししてくれだワン！', emotion: 'thinking' },
  { text: '使い方で困ったら、僕を長押しするワン！💡', emotion: 'thinking' },
  { text: 'ヘルプが必要なら、ダブルクリックだワン！', emotion: 'happy' },
];

export function getRandomAvatarMessage(): AvatarClickMessage {
  const randomIndex = Math.floor(Math.random() * avatarClickMessages.length);
  return avatarClickMessages[randomIndex];
}

export function playClickSound() {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.15);
}
