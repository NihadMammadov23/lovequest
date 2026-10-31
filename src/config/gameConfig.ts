/**
 * ============================================================================
 *  LOVE QUEST — FƏRDİLƏŞDİRMƏ FAYLI
 * ============================================================================
 *  Oyuna aid bütün fərdi məlumatlar BU fayldadır. Aşağıdakı dəyərləri dəyişin,
 *  yadda saxlayın və oyun yenilənsin (başqa faylı dəyişməyə ehtiyac yoxdur).
 *
 *  Təhlükəsiz redaktə qaydaları
 *  - Quruluşu (dırnaqlar, vergüllər, mötərizələr) qoruyun; yalnız mətnləri dəyişin.
 *  - Nümunə mətnləri öz xatirə və sözlərinizlə əvəz edə bilərsiniz.

 *  - Mətnlərdə avtomatik əvəz olunan bu dəyişənlərdən istifadə edə bilərsiniz:
 *        {girlfriend}  -> girlfriend.name
 *        {boyfriend}   -> boyfriend.name
 *        {anniversary} -> anniversary.display
 *  - Şəkillər: faylları /public/photos/ qovluğuna yerləşdirin və `photos` siyahısına əlavə edin.
 *    Yalnız .jpg, .jpeg, .png, .webp və .gif faylları qəbul olunur.
 *    Siyahını boş saxlasanız, foto bölməsi gizlədiləcək.
 *  - Keçidlər: sürpriz düyməsi yalnız https:// ilə başlayan keçidləri aça bilər.
 *    Digər keçidlər nəzərə alınmır. Konfiqurasiya sadə məlumatlardan ibarətdir
 *    və kod kimi icra edilmir.
 *
 *  Bu fayldakı səhvlər oyunu dayandırmır: `validateConfig()` yanlış dəyərləri
 *  düzəldir və brauzer konsoluna xəbərdarlıq yazır.
 * ============================================================================
 */

export interface CharacterConfig {
  /** Name shown in the game. */
  name: string;
  /** Short flavour text shown on the character introduction screen. */
  description: string;
  /** Pixel-art look. Colors must be #rrggbb. */
  look: {
    hair: string;
    hairLight: string;
    skin: string;
    top: string;
    pants: string;
  };
}

export interface GirlfriendConfig extends CharacterConfig {
  /** Default cosmetics worn when a new game starts (see COSMETICS in src/lib/cosmetics.ts). */
  defaultCosmetics: { hat: string; eyewear: string; earrings: string; cape: string };
}

export interface BoyfriendConfig extends CharacterConfig {
  beard: boolean;
  wristband: boolean;
}

export interface MemoryEntry {
  title: string;
  text: string;
}

export interface QuizQuestion {
  /** The question text. */
  question: string;
  /** 2 to 4 answer options. */
  options: string[];
  /** Index (starting at 0) of the correct option. */
  correctIndex: number;
  /** Optional custom reaction to a correct answer. */
  correctReaction?: string;
  /** Optional custom reaction to a wrong answer. */
  wrongReaction?: string;
}

export interface TranslatorItem {
  /** What the boyfriend says. */
  message: string;
  /** 2 to 4 possible interpretations. */
  options: string[];
  /** Index of the correct interpretation. */
  correctIndex: number;
  /** Funny line shown after answering. */
  reaction: string;
}

export interface ChampionTitle {
  /** Minimum total score needed for this title. */
  minScore: number;
  title: string;
}

export type SurpriseKind = "message" | "link" | "photo";

export interface SurpriseConfig {
  /** Text on the surprise button at the end of the game. */
  buttonLabel: string;
  /** "message" shows `message`; "link" shows a button to `url`; "photo" shows `photoPath`. */
  kind: SurpriseKind;
  /** Heading of the surprise popup. */
  title: string;
  /** Message body (used by all kinds). */
  message: string;
  /** Only for kind "link": must start with https:// */
  url?: string;
  /** Only for kind "photo": must be a /photos/... path. */
  photoPath?: string;
}

export interface GameConfig {
  girlfriend: GirlfriendConfig;
  boyfriend: BoyfriendConfig;
  /** Name of the game as shown on the title screen. */
  gameTitle: string;
  subtitle: string;
  /** Skippable intro text. */
  introText: string;
  /** Meaningful date. month is 1-12. */
  anniversary: { day: number; month: number; display: string };
  /** At least five relationship memories (revealed by hidden hearts, shown in the trophy room). */
  memories: MemoryEntry[];
  /** At least ten quiz questions (used in the Memory Maze). */
  quiz: QuizQuestion[];
  /** At least three inside jokes or playful roasts (boss taunts, loading screens, results). */
  insideJokes: string[];
  /** Generic reactions used when a quiz question has no custom reaction. */
  correctReactions: string[];
  incorrectReactions: string[];
  /** Boyfriend Translator mini-game content. */
  translator: TranslatorItem[];
  /** Funny titles awarded on the ending screen, based on total score. */
  championTitles: ChampionTitle[];
  /** The final love letter shown with the typewriter effect. Use \n for line breaks. */
  loveLetter: string;
  /** Message shown when all five secret hearts are found. */
  secretMessage: string;
  /** How many secret hearts (max 5) unlock the bonus ending. */
  secretEndingRequiredHearts: number;
  /** Optional photos for the bonus gallery (paths inside /public/photos/). */
  photos: string[];
  surprise: SurpriseConfig;
}

export const gameConfig: GameConfig = {
  gameTitle: "LOVE QUEST",
  subtitle: "Sevgili Çempionatı",

  girlfriend: {
    name: "Madina",
    description:
      "Arenanın ulduzu! Buruq saçları, parıltılı sırğaları və qarşısıalınmaz dondurma sevgisi ilə hər kəsdən seçilir.",
    look: {
      hair: "#24120a",
      hairLight: "#4a2616",
      skin: "#fff0c0",
      top: "#ffffff",
      pants: "#6a4fd1",
    },
    defaultCosmetics: { hat: "none", eyewear: "none", earrings: "drops", cape: "none" },
  },

  boyfriend: {
    name: "Nihad",
    description:
      "Son boss! Yuxulu, ac və bir az da dramatik — bəzən səhər yeməyindən əvvəl hər üçü birdən. Üstəlik, saqqalı da pis deyil.",
    look: {
      hair: "#1c1410",
      hairLight: "#3a2a20",
      skin: "#d9a67a",
      top: "#f4f1e8",
      pants: "#2b2f55",
    },
    beard: true,
    wristband: true,
  },

  introText:
    "Arenaya qeyri-adi bir rəqib daxil oldu! Görəsən, Madina bütün xaosdan sağ çıxıb sevgilisini məğlub edərək əsl çempion titulunu qazana biləcək?",

  anniversary: { day: 11, month: 7, display: "11 iyul" },

  // ---------------------------------------------------------------------------
  // Beş münasibət xatirəsi.
  // The first two are revealed by the hidden hearts in Level 1.
  // ---------------------------------------------------------------------------
  memories: [
    {
      title: "1-ci xatire — İlk qarşılaşma",
      text: "Hər şeyin başladığı an... Bəlkə də həmin gün bunun belə gözəl bir hekayəyə çevriləcəyini heç biriniz bilmirdiniz. Amma indi geriyə baxanda, yaxşı ki, yollarınız kəsişib.",
    },
    {
      title: "2-ci xatire — İlk görüş",
      text: "İlk görüşün həyəcanı, söhbətlər, gülüşlər və birlikdə keçirilən o xüsusi vaxt... Ən gözəl görüşlər bəzən planlaşdırılmadan yadda qalır.",
    },
    {
      title: "3-cü xatire — Birlikdə macera",
      text: "Birlikdə yaşadığınız hər macəra münasibətinizə yeni bir xatirə əlavə edir. Əsas məsələ hara getməyiniz deyil, yan-yana olmağınızdır.",
    },
    {
      title: "4-cü xatire — Kiçik xoşbextlikler",
      text: "Bəzən ən dəyərli anlar adi günlərin içində gizlənir: gözlənilməz bir gülüş, kiçik bir jest və ya səbəbsiz yerə gələn xoşbəxtlik hissi.",
    },
    {
      title: "5-ci xatire — Bizim günümüz",
      text: "15 oktyabr — sizin üçün xüsusi məna daşıyan gün. Birlikdə yazdığınız hekayənin daha neçə gözəl fəsli olacaq!",
    },
  ],

  // ---------------------------------------------------------------------------
  // Yaddaş labirinti üçün suallar.
  // İstəsəniz, sualları yalnız ikinizin bildiyi detallarla əvəz edin.
  // Questions 1-5 feed the first quiz station, questions 6-10 the second.
  // ---------------------------------------------------------------------------
  quiz: [
  {
    question: "İldönümümüz hansı tarixdədir?",
    options: ["15 oktyabr", "11 iyun", "17 iyul"],
    correctIndex: 0,
    correctReaction: "Düz tapdın! Tarixi xatırlamaq minimum tələbdir — hələlik minimumu keçdin!",
  },
  {
    question: "{girlfriend} ən çox hansı şirniyyatı sevir?",
    options: ["Pizza", "Dondurma", "Popkorn"],
    correctIndex: 1,
    correctReaction: "Dondurma! Bu oyundakı ən vacib məlumatı unutmaq olmaz.",
  },
  {
    question: "İlk görüşümüz üçün ən uyğun məkan hansıdır?",
    options: ["Film gecəsi", "Uzun gəzinti", "Romantik restoran"],
    correctIndex: 1,
  },
  {
    question: "Birlikdə film izləmək üçün ən yaxşı seçim hansıdır?",
    options: ["Evdə, rahat divanda", "CinemaPlus", "Açıq havada kino"],
    correctIndex: 1,
  },
  {
    question: "{girlfriend} üçün xəyal tətili necə olardı?",
    options: ["Parisdə romantik səyahət", "İtaliyada yay tətili", "Maldiv adalarında istirahət"],
    correctIndex: 0,
  },
  {
    question: "{girlfriend}-in fikrincə, {boyfriend}-in ən bezdirici xüsusiyyəti hansıdır?",
    options: ["Həddindən artıq yatmaq", "Hər şeyi çox düşünmək", "Telefonla çox vaxt keçirmək"],
    correctIndex: 0,
  },
  {
    question: "Münasibətimizin soundtrack-i hansı olardı?",
    options: ["Yenidən", "Just the Two of Us", "Qruz brat"],
    correctIndex: 1,
  },
  {
    question: "{girlfriend} hansı rəngi seçərdi?",
    options: ["Qara", "Ağ", "Göy"],
    correctIndex: 2,
  },
  {
    question: "{boyfriend} mətbəxdə nəyə daha çox ehtiyac duyur?",
    options: ["Sənə", "Bir az səbrə", "Daha çox təcrübəyə"],
    correctIndex: 0,
  },
  {
    question: "Birlikdə vaxt keçirmək üçün ən gözəl plan hansıdır?",
    options: ["Evdə film izləmək", "Uzun gəzintiyə çıxmaq", "Yeni restoran kəşf etmək"],
    correctIndex: 0,
  },
],

  // Daxili zarafatlar və mehriban sataşmalar.
  insideJokes: [
    "Madina güləndə bütün mübahisələr avtomatik olaraq təxirə salınır.",
    "{boyfriend} beş dəqiqəyə gələcəyini deyirsə, saatı yoxlamaq məsləhətdir.",
    "{girlfriend} dondurma görəndə bütün planlar ikinci plana keçir.",
  ],

  correctReactions: [
    "Əla! {girlfriend} bu oyunu yaxşı bilir.",
    "Düzdür! Deməli, diqqətlə qulaq asmısan.",
    "Bəli! Tamaşaçılar ayağa qalxdı!",
    "Mükəmməl! Baş əy, çempion.",
  ],
  incorrectReactions: [
    "Hmm... {boyfriend} deyəsən bunu görməzdən gəlir.",
    "Səhvdir, amma şirinsən. Bir də cəhd et!",
    "Tam olmadı! Xatirə cinləri gülüşür.",
    "Vay... münsiflər öz aralarında pıçıldaşır.",
  ],

  translator: [
    {
      message: "\"I'm not hungry.\"",
      options: [
        "Həqiqətən ac deyiləm.",
        "Sifariş etdiyinin yarısını yeyəcəyəm.",
        "Xahiş edirəm, yemək mövzusunu bağlayaq.",
      ],
      correctIndex: 1,
      reaction: "Klassika! Əvvəl onun yeməyinin yarısını yedi, sonra desert soruşdu.",
    },
    {
      message: "\"I'm fine.\"",
      options: [
        "Hər şey əladır.",
        "Yuxum gəlir, bir az da dramatikəm.",
        "Heç vaxt bu qədər xoşbəxt olmamışam.",
      ],
      correctIndex: 1,
      reaction: "Yaxşıdır. Həmişə yaxşıdır. “Yaxşıyam” artıq həyat tərzidir.",
    },
    {
      message: "\"Five more minutes.\"",
      options: [
        "Dəqiq beş dəqiqə.",
        "Nahar vaxtına qədər buradayam.",
        "Artıq durmuşam, vallah.",
      ],
      correctIndex: 1,
      reaction: "O beş dəqiqə sadəcə danışıqlara başlamaq üçün idi.",
    },
    {
      message: "\"I don't mind, you choose.\"",
      options: [
        "Heç bir fikrim yoxdur.",
        "Gizlində istədiyim şeyi seç, zəhmət olmasa.",
        "Nə desən, razıyam.",
      ],
      correctIndex: 1,
      reaction: "Əslində, vecinədir. Həm də çox. Sadəcə nə istədiyini tapmağını gözləyir.",
    },
    {
      message: "\"I'll be there in 5.\"",
      options: [
        "Artıq qapının qarşısındayam.",
        "Hələ evdən çıxmamışam.",
        "Qapından beş dəqiqəlik məsafədəyəm.",
      ],
      correctIndex: 1,
      reaction: "Buradakı beş dəqiqə zaman ölçüsü deyil, əhval-ruhiyyə ölçüsüdür.",
    },
    {
      message: "\"Nothing's wrong.\"",
      options: [
        "Doğrudan da heç nə olmayıb.",
        "Nəsə olub və bunu iki dəfə soruşmağını istəyirəm.",
        "Bir sendviç istəyərdim.",
      ],
      correctIndex: 1,
      reaction: "İki dəfə soruş, yanında da nəsə yeməli gətir. Tapşırıq tamamlandı.",
    },
    {
      message: "\"Just a quick look at my phone.\"",
      options: [
        "On saniyəyə qayıdacağam.",
        "Qırx beş dəqiqəliyəlik sağ ol.",
        "Telefonu həmişəlik kənara qoyuram.",
      ],
      correctIndex: 1,
      reaction: "Sonsuz lentə düşüb. Xilasetmə qrupu göndərin.",
    },
    {
      message: "\"That outfit is... interesting.\"",
      options: [
        "Sözlərimi düzgün seçmək üçün köməyə ehtiyacım var.",
        "Möhtəşəm görünürsən, danışmağı unutdum.",
        "Zəhmət olmasa, dərhal dəyiş.",
      ],
      correctIndex: 1,
      reaction: "Düzdür. Brain.exe işləməyi dayandırdı.",
    },
  ],

  championTitles: [
    { minScore: 0, title: "Ürək Toplamağa Yeni Başlayan" },
    { minScore: 4000, title: "Sertifikatlı Sevgili İdarəçisi" },
    { minScore: 7000, title: "Xaosun Kraliçası" },
    { minScore: 10000, title: "Kainatın Mübahisəsiz Sevgi Çempionu" },
  ],

  // Final sevgi məktubu. \\n yeni sətir yaradır. Mətn təxminən 1200 simvoldan qısa olsun.
  loveLetter:
    "Əziz {girlfriend},\n\n" +
    "Buludları, labirinti, bütün xaosu və bir az da dramatik sevgilini geridə qoydun. " +
    "Əlbəttə ki, bacardın. Sən həm bu oyunun, həm də mənim qəlbimin çempionusan.\n\n" +
    "{anniversary} tarixindən bəri hər adi günü yenidən yaşamaq istəyəcəyim gözəl bir səviyyəyə çevirmisən. " +
    "Gülüşlərin, səbrin və dondurmanı mənimlə bölüşdüyün üçün təşəkkür edirəm (əsasən).\n\n" +
    "Səninlə keçirdiyim hər an mənim üçün dəyərlidir. Yanımda olduğun, məni güldürdüyün və həyatımı daha gözəl etdiyin üçün minnətdaram. Qarşıda bizi gözləyən bütün macəraları birlikdə yaşamaq istəyirəm.\n\n" +
    "2-ci oyunçu həmişə sənin komandanda olacaq.\n\n" +
    "Həmişə sənin,\n{boyfriend}",

  secretMessage:
    "Beş gizli ürəyin hamısını tapdın! Bu oyunda bütün səviyyələri keçmək olar, amma mənim üçün ən böyük mükafat sənsən, {girlfriend}. Sən mənim ən sevimli macəramsan!",

  secretEndingRequiredHearts: 5,

  // Şəkilləri /public/photos/ qovluğuna əlavə edib yollarını burada göstərin.
  photos: [],

  surprise: {
    buttonLabel: "Sürprizini aç",
    kind: "message",
    title: "Görüş dəvətnaməsi",
    message:
      "{girlfriend}, sən rəsmi olaraq {boyfriend} ilə görüşə dəvət olunursan! Dondurma da dəvətnaməyə daxildir. Tarix, saat və məkan? Bunları birlikdə seçəcəyik. ❤️",
    // url: "https://example.com",       // for kind: "link" (https only)
    // photoPath: "/photos/surprise.jpg", // for kind: "photo"
  },
};
