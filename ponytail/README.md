# Ponytail — ZCode 插件（懒人高级开发模式）

> 他说什么都没说。他写了一行代码。能跑。
> "The best code is the code you never wrote." —— 最好的代码是你从未写下的代码。

本插件是 [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)（v5.3.3，MIT）向 ZCode 的移植。它把"最懒的高级开发工程师"装进你的 agent：**vibecoding 时防止过度工程化、防止重复造轮子、减少代码量**——写整个任务需要的最少新代码，优先复用仓库里已有的东西。

## 它做什么

- **每次会话自动生效**：SessionStart hook 注入"懒人规则集"（按当前强度档位过滤），并附带一份**代码库地图**——扫描项目顶层函数/类/导出，每目录一行、限 2000 字符，共享代码（utils/lib/services/components）优先列出。这让"先复用"不再需要搜索，是防重复造轮子的关键。
- **懒人阶梯（ladder）**：写代码前依次问——这功能需要存在吗（YAGNI）？代码库已有？标准库/平台原生有？已装依赖有？能一行搞定？都不行才写最小可用实现。
- **绝不砍掉的底线**：信任边界校验、防数据丢失的错误处理、安全、无障碍、用户明确要求的东西。有分支/循环/解析/金额/安全的新逻辑必须留一个小测试。
- **`shortcut:` 债务标记**：故意走捷径时留 `shortcut: <上限>, <升级时机>` 注释，`/ponytail-debt` 可以收割成台账。

## 六个斜杠命令

| 命令 | 作用 |
|---|---|
| `/ponytail [lite\|full\|ultra\|off]` | 切换强度档位或关闭；无参数报告当前档位（关闭状态下则按默认档位开启） |
| `/ponytail default <mode>` | 把默认档位持久化到配置（新会话生效） |
| `/ponytail-review` | 像会被半夜叫起来救火的高级开发一样审查当前 diff：bug、安全、真实负载、缺失测试、性能、可精简项。每条 finding 说清这是什么/问题/修法/不修会怎样 |
| `/ponytail-audit` | 同样的检查跑全仓库，先建地图再按重要性排序输出 |
| `/ponytail-debt` | 收割 `shortcut:` 注释为技术债台账 |
| `/ponytail-gain` | 展示官方基准测试收益榜（-53% 代码、-45% tokens、-26% 成本、-41% 时间，测试覆盖率反而更高） |
| `/ponytail-help` | 快速参考卡 |

六个技能（ponytail、ponytail-review、ponytail-audit、ponytail-debt、ponytail-gain、ponytail-help）也可用自然语言触发，中英文均可（如"帮我审查这次改动"、"审计这个代码库"、"别过度设计"）。

## 强度档位

| 档位 | 行为 |
|---|---|
| lite | 只做被要求的事，用一行点出更省的方案，让用户选 |
| full | 完整规则（默认） |
| ultra | 还会质疑需求本身：动手前先反驳没有必要的部分 |

## 配置

默认档位解析顺序：环境变量 `PONYTAIL_DEFAULT_MODE` > `~/.zcode/ponytail/config.json` 的 `defaultMode` > `full`。

```json
{ "defaultMode": "lite" }
```

`"off"` 表示新会话不自动激活，需要时手动 `/ponytail`。会话内的档位存在 `~/.zcode/ponytail/mode.txt`。

其他环境变量：`PONYTAIL_MAP=0` 关闭代码库地图注入；`PONYTAIL_MAP_CHARS=3000` 调大地图字符预算；`PONYTAIL_STATE_DIR` 重定向状态目录。

## 与上游 Claude Code 版的差异

- 不移植 band（提示框上方的横幅）、statusline 徽章、subagent 注入——ZCode 没有 `SubagentStart` 事件，也没有 statusline 配置。
- 模式标志是全局单文件（`~/.zcode/ponytail/mode.txt`），不再按项目哈希分文件。并行开多个项目时共享同一档位。
- 会话中切换档位立即生效（规则随确认注入），并在 compact 后重新注入。
- 关闭短语在英文之外新增中文："停止ponytail"、"正常模式"。

## Hooks

`hooks/hooks.json` 注册两个 hook（均为 `process` 类型，无 shell，Windows 友好）：

- `SessionStart`（startup|resume|clear|compact）→ `ponytail-activate.js`：解析档位，注入规则集 + 代码库地图。
- `UserPromptSubmit`（全部）→ `ponytail-mode-tracker.js`：识别 `/ponytail ...` 与关闭短语，持久化档位，切换时注入新档位规则；普通输入静默（空 JSON，退出码 0）。

## 许可

MIT，原始版权 Dietrich Gebert（ponytail）。本移植保留原许可证与署名。
