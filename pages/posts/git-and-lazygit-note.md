---
layout: post
title: git与轮椅lazygit使用笔记
date: 2026-05-16 10:18:29
cover: https://www.cachetide.top/header2.jpg
categories: [技术]
tags: [git,lazygit]
---

# Git&LazyGit
Git 的核心是四块区域
 **工作区**：你正在编辑的文件
 **暂存区**：准备进入下一次提交的内容
 **仓库历史**：已经提交的 commit
 **远程仓库**：GitHub、GitLab 等服务器上的仓库
常用检查命令
```
git status
git log --oneline --decorate --graph
git diff
git diff --staged
```
## 修改、暂存、提交
### Git
查看文件变化
```
git status
git diff
```
暂存文件
```
git add 文件名
git add .
```
取消暂存
```
git restore --staged 文件名
```
提交
```
git commit -m "提交说明"
```
修改最后一次提交信息
```
git commit --amend
```
### LazyGit 
进入 `Files` 面板
选中文件后按 `space` 暂存或取消暂存
也可以用操作菜单批量 `stage` / `unstage`
按 `c` 创建提交(直接按`c`默认全部提交)
修改最后一次提交可在 Commits 面板选择 `amend` / `reword` 相关操作
## 分支操作
### Git
查看分支
```
git branch
git branch -a
```
创建分支
```
git switch -c new-branch
```
切换分支
```
git switch main
```
删除本地分支
```
git branch -d branch-name
```
强制删除本地分支
```
git branch -D branch-name
```
删除远程分支
```
git push origin --delete branch-name
```
### LazyGit 
进入 `Branches` 面板
可以 `checkout`、`new branch`、`delete branch`、`merge`、`rebase`,按`?`获取具体提示
## 拉取与推送
### Git
拉取远程更新
```
git fetch origin
git pull
```
推送当前分支
```
git push origin main
```
第一次推送新分支
```
git push -u origin new-branch
```
强制推送，更安全的写法
```
git push --force-with-lease origin main
```
不要轻易用
```
git push --force
```
`--force-with-lease`会检查远程是否被别人更新过，安全性更好
### LazyGit 
通常 `p`(大写) 是 `pull`
通常 `P`(小写) 是 `push`
如果需要 `force push`，lazygit 会提示确认
使用 YubiKey、SSH key 时，按终端提示输入 PIN 或触摸设备
## 撤销修改
### Git
丢弃工作区某个文件的修改
```
git restore file.md
```
丢弃所有未提交修改
```
git restore .
```
取消暂存但保留文件修改
```
git restore --staged file.md
```
### LazyGit
在 `Files` 面板选中文件
通过 `discard` / `reset` / `checkout file` 丢弃修改
这类操作会丢内容，执行前要确认
## 回退版本
### Git
回到某个 commit，丢弃后面的提交
```
git reset --hard <commit>
```
同步回退 GitHub
```
git push --force-with-lease origin main
```
例子
```
git reset --hard c5b1232
git push --force-with-lease origin main
```
这种方式会改写历史，适合个人仓库或确认没人基于这些提交继续开发的情况
### LazyGit
进入 `Commits` 面板
选中目标 `commit`
找到 `reset to this commit`
选择 `hard reset`
然后 `push`，如需要则 `force push`
## 安全撤销提交
### Git
如果不想改写历史，用 revert
```
git revert <commit>
git push origin main
```
`revert` 会新增一个“撤销某次提交”的 `commit`，不会删除历史，更适合多人协作
### LazyGit
在 `Commits` 面板选中 `commit`
选择 `revert commit`
## 找回误删的提交
### Git
Git 很多操作都能通过 `reflog` 找回来
```
git reflog
```
找到目标 commit 后
```
git reset --hard <commit>
```
例如
```
git reset --hard 0b75298
```
### LazyGit 
如果普通 `commit` 列表看不到，可以使用 `reflog` 面板或直接在命令行执行 `git reflog`
## 合并与变基
### Git
合并分支
```
git switch main
git merge feature
```
变基
```
git switch feature
git rebase main
```
合并保留分支结构，rebase 会重写当前分支历史，让历史更线性
### LazyGit
在 `Branches` 面板选择目标分支
可执行 `merge` 或 `rebase`
出现冲突时，在 `Files` 面板处理冲突文件，解决后继续 `merge` / `rebase`
## 处理冲突
### Git
冲突出现后查看状态
```
git status
```
编辑冲突文件，保留需要的内容，然后
```
git add conflicted-file.md
git commit
```
如果是 rebase
```
git rebase --continue
```
放弃 merge
```
git merge --abort
```
放弃 rebase
```
git rebase --abort
```
### LazyGit
冲突文件会显示在`Files` 面板
打开文件手动解决冲突
`stage` 已解决文件
选择 `continue` /`abort`
## 临时保存修改 stash
### Git
保存当前修改
```
git stash
```
带说明保存
```
git stash push -m "临时修改"
```
查看 stash
```
git stash list
```
恢复最近一次 stash
```
git stash pop
```
恢复但不删除 stash
```
git stash apply
```
删除 stash
```
git stash drop
```
### LazyGit
在 `Files` 或 `Stash` 面板可以 `stash`、`apply`、`pop`、`drop`
切分支前如果不想提交，可以先 `stash`
## 标签 tag
### Git
创建标签
```
git tag v1.0.0
```
创建带说明的标签
```
git tag -a v1.0.0 -m "release v1.0.0"
```
推送标签
```
git push origin v1.0.0
```
推送所有标签
```
git push origin --tags
```
删除本地标签
```
git tag -d v1.0.0
```
删除远程标签
```
git push origin --delete v1.0.0
```
## Cherry-pick
### Git
把某个 commit 单独拿到当前分支
```
git cherry-pick <commit>
```
适合只想拿某个修复，不想合并整个分支的情况
### LazyGit
在 `Commits` 面板选中 `commit`
选择 `cherry-pick`
## 常用排查
### Git
查看某一行是谁改的
```
git blame file.md
```
查看某个提交内容
```
git show <commit>
```
查看两个分支差异
```
git diff main..feature
```
查看远程地址
```
git remote -v
```
修改远程地址
```
git remote set-url origin git@github.comuser/repo.git
```
## 我的建议
个人项目可以更灵活地使用
```
git reset --hard
git push --force-with-lease
```
多人协作项目优先使用
```
git revert
git merge
git rebase
```
危险操作前先看三件事
```
git status
git log --oneline --decorate --graph -10
git remote -v
```
如果不确定，先不要 `reset --hard`，也不要 `force push`