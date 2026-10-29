# 中国节假日日历卡片（studentLcc）

这是 Home Assistant Lovelace 自定义卡片，用于展示配套 `chineseholiday` 集成提供的中国节假日、农历、节气和纪念日信息。

配套后端：<https://github.com/studentLcc/chineseholiday>

## 安装

在 HACS 的前端仪表盘中添加自定义仓库：

```text
https://github.com/studentLcc/chineseholiday_card
```

安装后，在仪表盘资源中添加模块资源：

```yaml
resources:
  - type: module
    url: /hacsfiles/chineseholiday_card/ch_calendar-card.js
```

添加卡片并绑定后端实体：

```yaml
type: custom:ch_calendar-card
entity: sensor.chinese_holiday
```

如果后端使用旧版 YAML 配置并自定义了名称，请把 `entity` 改为对应的传感器实体 ID。

## 兼容说明

卡片优先读取后端实体的 `data` 属性；如果后端关闭 `show_detail`、没有提供嵌套的 `data`，卡片会改为读取实体的顶层属性。

卡片展示的后端数据包括：

- 今日公历、农历、星期和周数
- 今日及明日工作日/休息日/节假日状态
- 节气、公历节日和纪念日
- 最近节假日和纪念日倒计时
- 精确计时纪念日
- 结构化节假日及拼假详情

## 版本

当前版本：`0.3.5`

卡片实现了 Home Assistant 分区视图使用的 `getGridOptions()`，默认占用 12 列、4 行。
