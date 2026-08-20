Đây là những quy định về thiết kế một component:

- Luôn tồn tại ít nhất các files:
  - index.tsx: chứa UI
  - hook.ts: chứa xử lý logic
  - type.ts: chứa các type (không dùng interface)
- Dùng arrow function
- Dùng type, không dùng interface
- Định nghĩa props cho component trong index.ts và props của hook (phải kế thừa từ props type của component trong index)

```ts
    export const ComponentName = (props: ComponentNameProps) => {
        const {} = useComponentName(props);
        return <div></div>;
    }

    export const useComponentName = ({}: UseComponentNameProps) => {
        return {}
    }

    export type ComponentNameProps = {}

    export type UseComponentNameProps = ComponentNameProps & {}
```
