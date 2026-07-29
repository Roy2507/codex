# Inline Sort Editor

後台表格排序碼的原生 HTML5 / CSS3 / Vanilla JavaScript 元件。

## 檔案

- `InlineSortEditor.js`: ES6 class 元件主體。
- `styles.css`: 示範頁與編輯狀態樣式。
- `index.html`: 可直接用瀏覽器開啟的示範頁。

## 使用方式

```html
<script type="module">
  import InlineSortEditor from './InlineSortEditor.js';

  const editor = new InlineSortEditor('#moduleTable', {
    saveSort({ rows }) {
      const payload = rows.map((row) => ({
        id: row.dataset.id,
        sort: Number(row.dataset.sortValue)
      }));
      console.log(payload);
    },
    onBeforeSort(payload) {
      return true;
    },
    onAfterSort(payload) {}
  });
</script>
```

表格列需要提供排序儲存欄位，排序欄位需加上 `data-sort-cell`。

```html
<tr data-id="CRM" data-sort-value="2">
  <td data-sort-cell>2</td>
  <td>CRM</td>
</tr>
```

## 鍵盤操作

- `Enter`: 送出排序。
- `Esc`: 取消編輯。
- `Tab`: 送出並編輯下一列。
- `Shift+Tab`: 送出並編輯上一列。
- `ArrowUp`: 數值加一。
- `ArrowDown`: 數值減一。

## 特殊值

- `0` 或負數會移至第一列。
- 大於最大列數會移至最後一列。
- 非數字值會保留原排序值。

## Hook

- `onBeforeSort(payload)`: 排序前執行，回傳 `false` 可取消排序。
- `saveSort(payload)`: 排序完成後執行，可串接 API。
- `onAfterSort(payload)`: 排序完成與保存呼叫後執行。

同一頁可建立多個 `InlineSortEditor` 實例；元件會確保同時間只有一列處於編輯模式。
