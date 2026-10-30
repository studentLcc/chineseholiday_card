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
    url: /hacsfiles/chineseholiday_card/dist/ch_calendar-card.js
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

## 手动拉取节假日

卡片右上角的“拉取节假日”按钮会调用后端动作 `chineseholiday.get`，并把当前卡片的 `entity` 作为目标，只刷新该传感器对应的节假日。需要后端集成 `0.6.4` 或更新版本。这个按钮只拉取节假日，不会改动纪念日。

不需要按钮时，可以在卡片配置里关闭：

```yaml
type: custom:ch_calendar-card
entity: sensor.chinese_holiday
show_refresh: false
```

## 前端纪念日

公历和农历纪念日都可以直接加在卡片上，不需要写入后端节假日，也不需要改集成配置。

卡片底部的“我的纪念日”可以添加、删除这些日期。它们保存在当前 Home Assistant 用户的前端数据里，只影响这张卡片的展示：

- 不会写入节假日缓存
- 不会出现在集成的纪念日配置里
- 不会触发集成的通知脚本

名称里包含“生日”，并选择“每年，计算周岁/周年”时，会显示即将到来的年龄；其他名称显示周年。选择“每年重复，不计算周年”则只倒计时。选择“精确计时”会按添加时的日期和时间持续计算。

添加区域中选择“农历日期”后选择月份和日期即可。农历纪念日按每年重复计算，支持周岁/周年展示；精确计时只适用于公历日期。

也可以把纪念日写进卡片配置。这样随仪表盘保存，同样不会进入后端节假日：

```yaml
type: custom:ch_calendar-card
entity: sensor.chinese_holiday
show_memorials: true
anniversaries:
  - name: 妈妈生日
    date: "1970-03-21"
    mode: yearly_count
  - name: 发薪日
    date: "01-15"
    mode: yearly
  - name: 中秋节
    date: "L08-15"
    mode: yearly
  - name: 闰五月纪念日
    date: "LL05-15"
    mode: yearly
  - name: 搬家
    date: "2024-05-01 09:30:00"
    mode: timer
```

`date` 支持公历 `MM-DD`、`MMDD`、`YYYY-MM-DD`、`YYYY-MM-DD HH:MM:SS`，以及农历 `LMM-DD` 和闰月 `LLMM-DD`（例如 `L08-15`、`LL05-15`）。农历纪念日会在对应农历日期出现的年份提醒。`mode` 可以是：

| mode | 含义 |
| --- | --- |
| `yearly_count` | 每年重复，并根据年份显示周岁或周年 |
| `yearly` | 每年重复，只显示名称 |
| `timer` | 从精确时间开始计算已过或剩余时间 |

卡片配置里的纪念日会标为“配置”，卡片里临时添加的标为“前端”。视觉编辑器里也可以维护 `anniversaries`。

## 版本

当前版本：`0.5.0`

- `0.5.0`：支持卡片内添加公历/农历纪念日，并避免时钟刷新打断输入
- `0.4.1`：手动拉取节假日时绑定当前卡片实体
- `0.4.0`：增加手动拉取节假日按钮，以及不写入后端的前端纪念日
- `0.3.5`：为分区视图提供 `getGridOptions()`，默认占用 12 列、4 行
