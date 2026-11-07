import type { Locale } from "@/lib/types";

export interface SampleQuest {
  icon: string;
  title: string;
  description: string;
}

export interface SampleReward {
  title: string;
  description: string;
  pointCost: number;
}

export const SAMPLE_QUESTS: Record<Locale, SampleQuest[]> = {
  vi: [
    { icon: "coffee", title: "Nấu ăn cùng nhau", description: "Cùng nấu một bữa và ăn mà không dùng điện thoại." },
    { icon: "coffee", title: "Cà phê buổi sáng", description: "Pha cà phê hoặc trà buổi sáng cho người ấy." },
    { icon: "movie", title: "Tối xem phim", description: "Chọn một bộ phim, ôm nhau xem kèm đồ ăn vặt." },
    { icon: "sun", title: "Đi dạo bình minh", description: "Cùng nhau đi dạo và ngắm bình minh." },
    { icon: "mail", title: "Thư tình nhỏ", description: "Viết một lá thư ngắn và để ở nơi người ấy sẽ thấy." },
    { icon: "sparkles", title: "Khen nhau", description: "Dành cho nhau năm lời khen thật lòng hôm nay." },
    { icon: "moon", title: "Một giờ không điện thoại", description: "Dành một giờ bên nhau, không màn hình." },
    { icon: "dumbbell", title: "Tập thể dục cùng nhau", description: "Cùng tập 20 phút." },
    { icon: "droplet", title: "Uống đủ nước", description: "Uống 8 ly nước trong ngày." },
    { icon: "book", title: "Câu lạc bộ sách hai người", description: "Cùng đọc 20 trang một cuốn sách rồi kể cho nhau nghe." },
  ],
  en: [
    { icon: "coffee", title: "Cook together", description: "Cook a meal together and enjoy it without phones." },
    { icon: "coffee", title: "Morning coffee", description: "Make morning coffee or tea for your partner." },
    { icon: "movie", title: "Movie night", description: "Pick a film and watch it cuddled up with snacks." },
    { icon: "sun", title: "Sunrise walk", description: "Take a walk together and watch the sunrise." },
    { icon: "mail", title: "Love letter", description: "Write a short love letter and leave it where they'll find it." },
    { icon: "sparkles", title: "Compliment practice", description: "Give each other five genuine compliments today." },
    { icon: "moon", title: "No-phone hour", description: "Spend one hour together without any screens." },
    { icon: "dumbbell", title: "Workout together", description: "Do a 20-minute workout session together." },
    { icon: "droplet", title: "Stay hydrated", description: "Drink 8 glasses of water today." },
    { icon: "book", title: "Book club of two", description: "Read 20 pages of the same book and discuss them." },
  ],
};

export const SAMPLE_REWARDS: Record<Locale, SampleReward[]> = {
  vi: [
    { title: "Một ly cà phê", description: "Người ấy pha cho bạn ly cà phê yêu thích.", pointCost: 20 },
    { title: "Massage 15 phút", description: "Thư giãn với 15 phút massage.", pointCost: 30 },
    { title: "Chọn phim cuối tuần", description: "Bạn được chọn phim xem cuối tuần này.", pointCost: 40 },
    { title: "Một ngày nghỉ việc nhà", description: "Người ấy làm hết việc nhà hôm nay.", pointCost: 60 },
    { title: "Một món quà nhỏ", description: "Người ấy mua cho bạn một món quà bất ngờ.", pointCost: 80 },
    { title: "Hẹn hò trọn gói", description: "Người ấy lên kế hoạch và bao trọn một buổi hẹn.", pointCost: 100 },
  ],
  en: [
    { title: "A cup of coffee", description: "Your partner makes your favorite coffee.", pointCost: 20 },
    { title: "15-minute massage", description: "Relax with a 15-minute massage.", pointCost: 30 },
    { title: "Pick the weekend movie", description: "You choose what to watch this weekend.", pointCost: 40 },
    { title: "Day off from chores", description: "Your partner handles all chores today.", pointCost: 60 },
    { title: "Small gift", description: "Your partner buys you a small surprise.", pointCost: 80 },
    { title: "Date night", description: "Your partner plans and pays for a date night.", pointCost: 100 },
  ],
};
