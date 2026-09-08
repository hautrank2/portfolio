import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  // `public/` là tài sản phục vụ nguyên trạng, không phải source của app. Mã
  // mẫu để bạn đọc tải về nằm trong đó và cố tình viết theo kiểu khác (CommonJS),
  // nên lint nó chỉ tạo lỗi giả.
  { ignores: ["public/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default eslintConfig;
