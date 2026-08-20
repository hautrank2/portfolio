- Quy định về tạo Form trong Dialog cho tính năng A
- Phải có ít nhất 2 component đặt vào file index.tsx

```ts
export const AFormDialog = () => {
    return <Dialog>
      <AForm
        {...props}
        schema={schema}
        isRefetchRef={isRefetchRef}
        ref={wlRef}
      />
    </Dialog>
};

export const AForm = () => {
    return <Box component="form" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
    <DialogTitle>
        {props.edit
        ? t("service:face:action:selectFace")
        : t("service:face:action:addFace")}
    </DialogTitle>

    <DialogContent></DialogContent>

    <DialogActions
        sx={{
            borderTop: 1,
            borderColor: "divider",
            position: "sticky",
            bottom: 0,
            backgroundColor: "background.paper",
        }}
    >
       //1 nut Cancel, 1 Nut Submit
      </DialogActions>
    </Box>
}
```

- Một số props bắt buộc đặt vào file type.ts
    - isEdit
    - defaultValues

```ts

export type AFormProps = {}

export type AFormDialogProps = AFormProps & {}

```

- Phải có định nghĩ về zod, đặt trong file type.ts