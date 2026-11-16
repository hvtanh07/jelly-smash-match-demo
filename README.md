# Jelly Smash Match (demo)

Demo chơi được, dựa trên GDD Jelly Smash (https://hvtanh07.github.io/gdd-jelly-smash/) với 2 thay đổi:

- Lối chơi chính đổi thành swap match-3: đổi chỗ 2 khối cạnh nhau để tạo hàng 3+ cùng màu.
- Không còn cannon đặt sẵn. Có 1 hàng 5 slot chờ: mỗi lần match sinh 1 cannon cùng màu vào slot trống, bắn hết đạn thì cannon biến mất.

Giữ nguyên theo GDD: đạn = 10 + 5 × (n − 3); cannon chỉ bắn khối cùng màu ở hàng đầu (khối thấp nhất mỗi cột) và đang nằm trong khung nhìn thấy, trái sang phải, không bắn xuyên, không có mục tiêu thì chờ; target grid trượt xuống từ lần swap đầu, chạm vạch đỏ là thua.

Chơi: https://hvtanh07.github.io/jelly-smash-match-demo/

Board luôn có ít nhất 1 swap tạo hàng 3 của một màu ở hàng dưới cùng target grid.

Target grid: level 1 9×16, level 2 10×20, level 3 11×24, level 4 12×28 (cột × hàng). Board match-3 vẫn 7×7.

Toàn bộ game nằm trong `index.html` (canvas, không cần build). Thanh chọn trên đầu cho đổi luật khi slot đầy. Cannon kẹt (còn đạn, không có mục tiêu) đứng chờ, không có cách bỏ.

## Bot playtest

`node playtest/bot.js <random|smart>` (cần Playwright). Kết quả lần chạy 16/11/2026 ở `playtest/results-2026-11-16.txt`.

Trang có meta `noindex`/`noai`. Repo này public.
