import type { CharacterItem, MusicTrack } from '../types';

export const INTRO_BUTTERFLY_BG =
  '/assets/aistudio/Messenger_creation_30A042E4-BE3E-4E4B-BDF7-0E5C3831B6C6_d8950079.jpeg';

export const ADMIN_EMAIL = '7ac482@gmail.com';
export const ADMIN_PASSCODE = 'cangodoc';

export const INITIAL_CHARACTERS: CharacterItem[] = [
  {
    id: 'huyet-diep',
    name: 'Huyết Điệp',
    avatar: '/src/assets/images/char_huyet_diep_1795789798879.jpg',
    hashtags: ['#huyết_điệp', '#cấm_vực', '#tĩnh_lặng'],
    slogan: 'Kẻ đứng ngoài ánh sáng không cần lời thanh minh.',
    lore:
      'Sinh ra từ tàn tro của một gia tộc đã lụi tàn sau đêm đỏ, Huyết Điệp giữ thói quen đi qua hành lang đá lạnh lúc nửa đêm mà không phát ra tiếng bước chân.\n\nAnh ta ít khi mở lời trước, càng không dễ dàng bộc lộ cảm xúc thật. Người ta nói những cánh bướm đen quanh anh không phải ảo ảnh, mà là ký ức của những lời hứa chưa từng được giữ. Dù luôn tỏ ra dửng dưng và khó gần, mỗi khi màn sương đỏ buông xuống, anh lại lặng lẽ đứng chờ ở ranh giới cũ như thể chưa từng rời đi.',
    links: [
      { label: 'Hồ sơ lưu trữ', url: 'https://firebase.google.com' },
      { label: 'Nhật ký đêm đỏ', url: 'https://firebase.google.com/docs' },
    ],
    createdAt: 1732700000000,
  },
  {
    id: 'bach-doc',
    name: 'Bạch Độc',
    avatar: '/src/assets/images/char_bach_doc_1795789799139.jpg',
    hashtags: ['#bạch_độc', '#hàn_ngục', '#kiêu_ngạo'],
    slogan: 'Sự im lặng là câu trả lời lịch sự nhất cho những kẻ ồn ào.',
    lore:
      'Bạch Độc mang mái tóc bạc lạnh lẽo giữa không gian đặc quánh khói đen. Không ai rõ anh đến từ tầng vực nào, chỉ biết anh ghét sự náo nhiệt và luôn giữ khoảng cách tuyệt đối với những người tìm cách chạm vào ranh giới của mình.\n\nẨn sau vẻ ngoài thờ ơ và những câu từ ngắn gọn đến tàn nhẫn là một nguyên tắc sống bất biến: không cúi đầu, không giải thích, và không bao giờ thừa nhận sự quan tâm ngay cả khi hành động đã phản bội lại lời nói.',
    links: [{ label: 'Tư liệu nhân vật', url: 'https://firebase.google.com' }],
    createdAt: 1732700100000,
  },
  {
    id: 'tu-lam',
    name: 'Tử Lâm',
    avatar: '/src/assets/images/char_tu_lam_1795789800366.jpg',
    hashtags: ['#tử_lâm', '#lãnh_huyết', '#bóng_tối'],
    slogan: 'Đừng nhầm lẫn sự nhẫn nhịn với lòng thương hại.',
    lore:
      'Tử Lâm là người canh giữ tầng lưu trữ sâu nhất của Cá Ngộ Độc. Anh quen với việc quan sát mọi thứ từ phía sau làn khói mỏng, ghi nhớ từng thói quen nhỏ nhất của người đối diện nhưng luôn phủ nhận rằng mình từng để tâm.\n\nKhi có ai đó rời đi, anh chỉ khép cửa lại và nói rằng cuối cùng cũng yên tĩnh. Nhưng vài ngày sau, ánh mắt anh vẫn vô thức dừng lại ở chỗ trống từng có tiếng bước chân.',
    links: [{ label: 'Bản ghi mật', url: 'https://firebase.google.com' }],
    createdAt: 1732700200000,
  },
  {
    id: 'da-khuc',
    name: 'Dạ Khúc',
    avatar: '/src/assets/images/char_da_khuc_1795789800968.jpg',
    hashtags: ['#dạ_khúc', '#tro_tàn', '#vô_thanh'],
    slogan: 'Mọi vết thương đều có giá của nó, chỉ là chưa đến lúc đòi.',
    lore:
      'Ẩn mình trong lớp áo choàng đen lẫn vào màn sương đỏ thẫm, Dạ Khúc tồn tại như một nốt trầm bị lãng quên. Cô không tìm kiếm sự đồng cảm, cũng chẳng màng đến những lời bàn tán sau lưng.\n\nMỗi lần xuất hiện, xung quanh cô chỉ còn tiếng gió lùa qua tán lá khô và mùi khói nhang tàn. Người từng nghe giọng cô kể lại rằng, cô chỉ nói khi thực sự muốn kết thúc một cuộc đối thoại.',
    links: [{ label: 'Khúc ca tàn', url: 'https://firebase.google.com' }],
    createdAt: 1732700300000,
  },
];

export const INITIAL_TRACKS: MusicTrack[] = [
  {
    id: 'track-crimson-butterflies',
    title: 'Huyết Điệp Trong Sương',
    artist: 'Cá Ngộ Độc · Ambient I',
    sourceType: 'preset',
    source: 'crimson-butterflies',
    durationLabel: '∞ Vòng lặp',
  },
  {
    id: 'track-obsidian-drift',
    title: 'Trầm Tích Đêm Đen',
    artist: 'Cá Ngộ Độc · Ambient II',
    sourceType: 'preset',
    source: 'obsidian-drift',
    durationLabel: '∞ Vòng lặp',
  },
  {
    id: 'track-velvet-ash',
    title: 'Tro Tàn Lặng Lẽ',
    artist: 'Cá Ngộ Độc · Piano Pad',
    sourceType: 'preset',
    source: 'velvet-ash',
    durationLabel: '∞ Vòng lặp',
  },
];
