# Jelly Smash (demo)

Demo chơi được, dựa trên GDD Jelly Smash (https://hvtanh07.github.io/gdd-jelly-smash/).

Chơi: https://hvtanh07.github.io/jelly-smash-match-demo/

## Bản 2026-11-24: thử A+B+C

- Luật gốc theo GDD 1.1, 1.2, 1.4: swap match-3, mỗi match ra 1 pháo, đạn = 2n − 3, pháo cùng màu gộp đạn, slot đầy thì mất pháo, pháo tự bắn khối hàng trước trong khung nhìn.
- Level 1–15 và element của chúng (Chocolate từ L7, slot khóa màu từ L12, ô trống theo hình board) lấy từ Level Builder (`hvtanh07/jelly-smash-level-builder`, `src/data/levels.json`), ở `js/levels.js`.
- Hướng dẫn level 1 (2026-11-24): 4 bước, game dừng ở mỗi bước, chỉ cho đổi đúng 2 khối được chỉ: match 3 đúng màu kiến, hàng 4 = bom xuyên, chữ T = bom, hàng 5 = pháo cầu vồng. Code ở `js/ftue.js`.
- A Power (tạm bỏ khỏi demo từ 2026-11-24, code vẫn còn trong engine, `power:false`): mỗi match +1. Match không có mục tiêu, pháo mất vì slot đầy, pháo còn đạn khi màu đã hết: số đạn đó vào Power. Đầy 40 thì Super, 8 phát cầu vồng.
- B Đặc biệt (bản 2, theo góp ý 2026-11-24): thẳng 4 = ném 3 bom xuyên vào 3 cột có khối thấp nhất, mỗi trái trúng 3 khối thấp nhất của cột. T/L = ném 1 bom vào 1 khối ngẫu nhiên trong 3 hàng dưới cùng, nổ 3×3. Thẳng 5+ = Pháo cầu vồng (5 đạn, mọi màu) vào chung hàng slot.
- C Feel: hiệu ứng, âm thanh, rung máy, combo dây chuyền (+1 đạn mỗi bước).
- Nút B, C trên thanh để tắt từng phần và so với luật gốc.

Code: `index.html` (UI), `js/engine.js` (luật, fork từ engine của Level Builder), `js/render.js` (vẽ + feel), `js/format.js`, `js/levels.js`. Không cần build. Bản demo cũ: `legacy.html`.

## Bot

`node playtest/sim.mjs [số lần]` chạy bot không cần trình duyệt, so luật gốc với A+B+C. Kết quả: `playtest/results-2026-11-24-abc.txt`.

Bot cũ cho `legacy.html`: `node playtest/bot.js <random|smart> <n|small|gdd>` (cần Playwright).

Trang có meta `noindex`/`noai`. Repo này public.
