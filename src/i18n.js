// ── i18n — English primary, Vietnamese as toggle ─────────────────────────────

const STRINGS = {
  en: {
    // App + home
    app_title: 'WOLVES',
    app_subtitle: 'Wolvesville · Offline Party Game',
    home_create: '🎲 Create Room (Host)',
    home_join: '👥 Join Room',
    home_or: 'or',
    home_offline_host: '📷 Host Offline (QR mode)',
    home_offline_join: '📷 Join Offline (Scan QR)',
    home_hint: 'Connect over local WiFi — no internet needed',

    offline_host_title: '📷 Offline Room',
    offline_host_hint: 'No server needed. Add each player by sharing QR codes back and forth.',
    offline_add_player: '➕ Add Next Player',
    offline_pair_title: '📷 Add Player',
    offline_pair_step1: 'Step 1 of 2: Player scans this QR with their phone',
    offline_pair_step2: 'Step 2 of 2: Now scan the QR shown on the player\'s phone',
    offline_scan_answer: '📷 Scan Player\'s Answer',
    offline_join_title: '📷 Join Offline',
    offline_join_hint: 'Enter your name, then scan the QR code shown on the host\'s phone.',
    offline_scan_offer: '📷 Scan Host\'s QR',
    offline_answer_hint: 'Show this QR to the host to finish the connection:',
    offline_generating: 'Generating QR code…',
    offline_connecting: 'Connecting…',
    offline_connected: 'Connected!',
    offline_invalid_qr: 'That QR code was not valid. Try again.',
    offline_name_first: 'Enter the player\'s name first',
    offline_camera_denied: 'Camera access denied. Enable it in your browser settings.',
    offline_handshake_timeout: 'Connection timed out. Both phones must be on the same WiFi with internet at setup time. Try again.',

    // Host setup
    host_room_title: 'Your Room',
    host_qr_hint: 'Players scan the QR code with Safari/camera to join',
    host_starting: 'Starting server…',
    host_waiting: 'Waiting for players to join…',
    host_players_label: 'Players In Lobby',
    host_no_players: 'No one yet…',
    host_preset_label: 'Quick Preset by Player Count',
    host_custom_label: 'Or customize roles:',
    host_no_roles: 'No roles selected',
    btn_deal_roles: '🃏 Deal Roles',
    btn_start_game: '⚔️ Start Game',
    btn_cancel: 'Cancel',

    // Player join
    join_title: 'Join Room',
    join_room_label: 'Enter the room code your host gave you',
    join_room_placeholder: 'Room code (6 chars)',
    join_name_placeholder: 'Your name',
    join_room_display: 'Room code:',
    btn_join: 'Enter Room',
    err_room_required: 'Enter a room code',
    err_name_required: 'Enter your name',
    join_connecting: 'Connecting…',
    join_connected: 'Connected! Waiting for the lobby…',
    join_reconnect: '🔄 Reconnecting to your room…',
    join_finding_old: '🔄 Finding your room',

    // Lobby
    lobby_title: '🏕️ Waiting To Start',
    lobby_hint: 'The host will start the game once everyone has joined',

    // Role reveal
    reveal_top: 'Your Role',
    reveal_dont_show: 'Don\'t let others see your screen',
    btn_understood: 'Understood ✓',
    wolf_teammates: '🐺 Wolf teammates:',

    // Night / Day
    night: 'Night',
    day: 'Day',
    day_banner: '☀️ Day',
    vote_banner: '🗳️ Voting',
    day_hint: 'Discuss and find the wolves!',
    vote_hint: 'Tap on the name of the player you want to eliminate',
    vote_host_end: 'End Voting (Host)',
    mute_hint: 'Stay quiet — night has begun…',
    gunner_bullets_left: 'bullets left',
    btn_shoot: 'Shoot now',

    // Wake-up
    wake_sub: 'Wake up and act',
    btn_sleep: '😴 Go Back to Sleep',

    // Dead overlay
    dead_title: 'You Have Died',
    dead_hint: 'You may still watch but you cannot reveal any information',

    // Game over
    btn_play_again: '🔄 New Game',
    btn_end_room: '✕ Close Room',
    waiting_for_host_new: 'Waiting for the host to start a new game…',
    all_roles: '📜 All Roles',
    room_closed_alert: 'The host has closed the room. Thanks for playing!',

    win_village_title: 'The Village Wins!',
    win_village_sub: 'All wolves have been eliminated. The villagers survive!',
    win_wolves_title: 'The Wolves Win!',
    win_wolves_sub: 'The wolves have taken over the village.',
    win_jester_title: 'The Jester Wins!',
    win_jester_sub: 'The jester was voted out, exactly as planned!',
    win_amor_title: 'Love Wins!',
    win_amor_sub: 'The lovers survived together!',
    game_over_default: 'Game Over',

    // GM panel
    gm_panel_title: '🎮 GM Panel',
    gm_phase: 'Phase',
    gm_round: 'Round',
    gm_timer: '⏱️ Timer',
    btn_start_night_timer: '▶ Start Night Timer (90s)',
    gm_phase_ctrl: '🔄 Phase Controls',
    btn_resolve_night: '🌙 Resolve Night',
    btn_start_day: '☀️ Start Day',
    btn_start_vote: '🗳️ Start Voting',
    btn_next_phase: '⏭ Next Phase',
    gm_wake: '🔔 Wake Roles',
    gm_no_roles_dealt: 'No roles dealt yet',
    gm_eliminate: '⚰️ Eliminate Players',
    gm_log: '📜 Game Log',
    btn_gm_close: '✕ Close Panel',
    btn_kick: 'Kick',
    label_dead: 'Dead',

    // Confirmations
    confirm_eliminate: 'Eliminate {name} ({role})?',
    convert_alert: '😱 You have been turned into a Wolf by the Alpha Wolf!',

    // iOS banner
    ios_banner: '📱 Open in Safari to connect — no install needed',

    // Action sheets (per role)
    sheet_wolf_title: '🐺 Pick a victim',
    sheet_wolf_instr: 'The wolf pack chooses one player to attack tonight',
    sheet_seer_title: '👁 Investigate',
    sheet_seer_instr: 'Choose someone to see if they are a Wolf',
    sheet_seer_wait: '👁 Waiting for result on {name}…',
    sheet_aura_title: '✨ Read aura',
    sheet_aura_instr: 'Choose someone to see their Good / Evil aura',
    sheet_aura_wait: '✨ Reading aura of {name}…',
    sheet_bodyguard_title: '🛡 Protect whom?',
    sheet_bodyguard_instr: 'Choose someone to protect tonight',
    sheet_trapper_title: '🪤 Set a trap on whom?',
    sheet_trapper_instr: 'Choose someone to set a trap on',
    sheet_priest_title: '✝️ Bless someone',
    sheet_priest_instr: 'Choose someone to bless (immune tonight)',
    sheet_medium_title: '🔮 Commune with the dead',
    sheet_medium_instr: 'Choose a dead player to question',
    sheet_witch_title: '🧪 Witch — Choose action',
    sheet_witch_used_all: 'You have used all your potions.',
    sheet_witch_or_skip: 'Or skip tonight.',
    btn_witch_heal: '💧 Save tonight\'s victim',
    btn_witch_poison: '☠️ Poison someone',
    btn_skip: 'Skip',
    witch_heal_used: '💧 Healing potion used.',

    seer_result_title: '👁 Seer Result',
    seer_is_wolf: '🐺 IS A WOLF!',
    seer_not_wolf: '✅ Not a Wolf',
    aura_result_title: '✨ Aura Seer Result',
    aura_evil: '🔴 EVIL aura',
    aura_good: '🔵 GOOD aura',

    // Common
    yes: 'Yes',
    no: 'No',
    close: 'Close',
  },

  vi: {
    app_title: 'SÓI',
    app_subtitle: 'Wolvesville · Trò Chơi Offline',
    home_create: '🎲 Tạo Phòng (Host)',
    home_join: '👥 Tham Gia Phòng',
    home_or: 'hoặc',
    home_offline_host: '📷 Tạo Phòng Offline (Quét QR)',
    home_offline_join: '📷 Vào Phòng Offline (Quét QR)',
    home_hint: 'Kết nối qua WiFi nội bộ, không cần internet',

    offline_host_title: '📷 Phòng Offline',
    offline_host_hint: 'Không cần máy chủ. Thêm từng người chơi bằng cách chia sẻ mã QR qua lại.',
    offline_add_player: '➕ Thêm Người Chơi Tiếp Theo',
    offline_pair_title: '📷 Thêm Người Chơi',
    offline_pair_step1: 'Bước 1/2: Người chơi quét mã QR này',
    offline_pair_step2: 'Bước 2/2: Bây giờ quét QR trên điện thoại của họ',
    offline_scan_answer: '📷 Quét QR Trả Lời',
    offline_join_title: '📷 Vào Phòng Offline',
    offline_join_hint: 'Nhập tên của bạn, sau đó quét mã QR trên điện thoại của chủ phòng.',
    offline_scan_offer: '📷 Quét QR Chủ Phòng',
    offline_answer_hint: 'Cho chủ phòng quét QR này để hoàn tất kết nối:',
    offline_generating: 'Đang tạo mã QR…',
    offline_connecting: 'Đang kết nối…',
    offline_connected: 'Đã kết nối!',
    offline_invalid_qr: 'Mã QR không hợp lệ. Thử lại.',
    offline_name_first: 'Nhập tên người chơi trước',
    offline_camera_denied: 'Truy cập camera bị từ chối. Cấp quyền trong cài đặt trình duyệt.',
    offline_handshake_timeout: 'Kết nối quá hạn. Cả hai điện thoại phải cùng WiFi và có internet lúc thiết lập. Thử lại.',

    host_room_title: 'Phòng Của Bạn',
    host_qr_hint: 'Người chơi quét mã QR bằng Safari/camera để vào phòng',
    host_starting: 'Đang khởi động máy chủ…',
    host_waiting: 'Đang chờ người chơi tham gia…',
    host_players_label: 'Người Chơi Đã Vào',
    host_no_players: 'Chưa có ai…',
    host_preset_label: 'Chọn Preset Số Người Chơi',
    host_custom_label: 'Hoặc tùy chỉnh vai:',
    host_no_roles: 'Chưa chọn vai',
    btn_deal_roles: '🃏 Chia Vai',
    btn_start_game: '⚔️ Bắt Đầu Trò Chơi',
    btn_cancel: 'Huỷ',

    join_title: 'Tham Gia Phòng',
    join_room_label: 'Nhập mã phòng do chủ phòng cung cấp',
    join_room_placeholder: 'Mã phòng (6 ký tự)',
    join_name_placeholder: 'Tên của bạn',
    join_room_display: 'Mã phòng:',
    btn_join: 'Vào Phòng',
    err_room_required: 'Nhập mã phòng',
    err_name_required: 'Nhập tên của bạn',
    join_connecting: 'Đang kết nối…',
    join_connected: 'Đã kết nối! Đang chờ vào sảnh…',
    join_reconnect: '🔄 Đang kết nối lại với phòng…',
    join_finding_old: '🔄 Tìm phòng cũ',

    lobby_title: '🏕️ Đang Chờ Bắt Đầu',
    lobby_hint: 'Host sẽ bắt đầu trò chơi khi mọi người đã vào',

    reveal_top: 'Vai của bạn',
    reveal_dont_show: 'Đừng để người khác thấy màn hình của bạn',
    btn_understood: 'Đã Hiểu ✓',
    wolf_teammates: '🐺 Đồng đội sói:',

    night: 'Đêm',
    day: 'Ngày',
    day_banner: '☀️ Ban Ngày',
    vote_banner: '🗳️ Bỏ Phiếu',
    day_hint: 'Thảo luận và tìm ra Sói!',
    vote_hint: 'Nhấn vào tên người bạn muốn loại trừ',
    vote_host_end: 'Kết Thúc Bỏ Phiếu (Host)',
    mute_hint: 'Tắt tiếng, đêm bắt đầu…',
    gunner_bullets_left: 'đạn còn lại',
    btn_shoot: 'Bắn ngay',

    wake_sub: 'Hãy thức dậy và làm nhiệm vụ',
    btn_sleep: '😴 Đi Ngủ',

    dead_title: 'Bạn Đã Chết',
    dead_hint: 'Bạn vẫn có thể quan sát nhưng không được tiết lộ thông tin',

    btn_play_again: '🔄 Chơi Ván Mới',
    btn_end_room: '✕ Kết Thúc Phòng',
    waiting_for_host_new: 'Đang chờ chủ phòng bắt đầu ván mới…',
    all_roles: '📜 Tất cả các vai',
    room_closed_alert: 'Chủ phòng đã đóng phòng. Cảm ơn bạn đã chơi!',

    win_village_title: 'Làng Chiến Thắng!',
    win_village_sub: 'Tất cả sói đã bị tiêu diệt. Dân làng sống sót!',
    win_wolves_title: 'Sói Chiến Thắng!',
    win_wolves_sub: 'Bọn sói đã thống trị ngôi làng.',
    win_jester_title: 'Chú Hề Thắng!',
    win_jester_sub: 'Hề đã bị bỏ phiếu loại, đúng kế hoạch!',
    win_amor_title: 'Tình Yêu Chiến Thắng!',
    win_amor_sub: 'Đôi tình nhân đã cùng nhau sống sót!',
    game_over_default: 'Trò Chơi Kết Thúc',

    gm_panel_title: '🎮 Bảng Điều Khiển',
    gm_phase: 'Pha',
    gm_round: 'Vòng',
    gm_timer: '⏱️ Hẹn Giờ',
    btn_start_night_timer: '▶ Bắt Đầu Giờ Đêm (90s)',
    gm_phase_ctrl: '🔄 Điều Khiển Pha',
    btn_resolve_night: '🌙 Giải Quyết Đêm',
    btn_start_day: '☀️ Bắt Đầu Ngày',
    btn_start_vote: '🗳️ Bắt Đầu Bỏ Phiếu',
    btn_next_phase: '⏭ Pha Tiếp Theo',
    gm_wake: '🔔 Đánh Thức Vai',
    gm_no_roles_dealt: 'Chưa chia vai',
    gm_eliminate: '⚰️ Loại Người Chơi',
    gm_log: '📜 Nhật Ký',
    btn_gm_close: '✕ Đóng Panel',
    btn_kick: 'Loại',
    label_dead: 'Đã chết',

    confirm_eliminate: 'Loại {name} ({role})?',
    convert_alert: '😱 Bạn đã bị Sói Đầu Đàn chuyển hóa thành Sói!',

    ios_banner: '📱 Mở bằng Safari để kết nối với nhau, không cần cài app',

    sheet_wolf_title: '🐺 Chọn nạn nhân',
    sheet_wolf_instr: 'Đội sói chọn một người để tấn công đêm nay',
    sheet_seer_title: '👁 Kiểm tra danh tính',
    sheet_seer_instr: 'Chọn một người để xem họ có phải Sói không',
    sheet_seer_wait: '👁 Đang chờ kết quả cho {name}…',
    sheet_aura_title: '✨ Xem hào quang',
    sheet_aura_instr: 'Chọn một người để xem hào quang Thiện / Ác',
    sheet_aura_wait: '✨ Đang xem hào quang của {name}…',
    sheet_bodyguard_title: '🛡 Bảo vệ ai?',
    sheet_bodyguard_instr: 'Chọn một người để bảo vệ đêm nay',
    sheet_trapper_title: '🪤 Đặt bẫy ở đâu?',
    sheet_trapper_instr: 'Chọn một người để đặt bẫy',
    sheet_priest_title: '✝️ Ban phép lành',
    sheet_priest_instr: 'Chọn một người để ban phép lành (miễn nhiễm đêm nay)',
    sheet_medium_title: '🔮 Giao tiếp với người đã khuất',
    sheet_medium_instr: 'Chọn một người đã chết để hỏi thăm',
    sheet_witch_title: '🧪 Phù Thủy, chọn hành động',
    sheet_witch_used_all: 'Bạn đã dùng hết phép.',
    sheet_witch_or_skip: 'Hoặc bỏ qua đêm nay.',
    btn_witch_heal: '💧 Cứu nạn nhân đêm nay',
    btn_witch_poison: '☠️ Đầu độc một người',
    btn_skip: 'Bỏ qua',
    witch_heal_used: '💧 Đã sử dụng bình thuốc Cứu.',

    seer_result_title: '👁 Kết quả Tiên Tri',
    seer_is_wolf: '🐺 LÀ SÓI!',
    seer_not_wolf: '✅ Không phải Sói',
    aura_result_title: '✨ Kết quả Tiên Tri Hào Quang',
    aura_evil: '🔴 Hào quang ÁC',
    aura_good: '🔵 Hào quang THIỆN',

    yes: 'Có',
    no: 'Không',
    close: 'Đóng',
  },
};

const STORAGE_KEY = 'wolves-lang';
let _lang = 'en';
const _listeners = new Set();

export function initI18n() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'vi') _lang = saved;
  } catch (_) {}
  document.documentElement.setAttribute('lang', _lang);
}

export function getLang() {
  return _lang;
}

export function setLang(lang) {
  if (lang !== 'en' && lang !== 'vi') return;
  _lang = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
  document.documentElement.setAttribute('lang', _lang);
  applyAllI18n();
  _listeners.forEach(fn => fn(lang));
}

export function toggleLang() {
  setLang(_lang === 'en' ? 'vi' : 'en');
}

export function onLangChange(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function t(key, vars) {
  let s = STRINGS[_lang]?.[key] ?? STRINGS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(`{${k}}`, v);
    }
  }
  return s;
}

// Apply data-i18n attributes across the DOM.
//   <button data-i18n="btn_join">Vào Phòng</button>
//   <input data-i18n-placeholder="join_name_placeholder">
//   <span data-i18n-html="some_html_key">
export function applyAllI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  // Update language toggle pill label
  const toggle = document.getElementById('lang-toggle');
  if (toggle) toggle.textContent = _lang === 'en' ? 'EN · VI' : 'VI · EN';
}
