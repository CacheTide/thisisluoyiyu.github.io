---
layout: post
title: Pixel7pro隐藏root折腾笔记
date: 2026-01-24 17:03:51
cover: https://www.cachetide.top/cywl.jpg
tags: [刷机,ROOT,Android,Pixel7pro]
categories: [技术]
---

> 最近海鲜市场捡了一个pixel 7 pro,打算用来root玩，最开始按照网上最普遍的教程刷Magisk，但是发现root会被检测，于是用Kernel＋SUS+Tricky来隐藏root，这里特别感谢[老王](https://blog.cxzlw.top/)和ziantt教我这个零root经验的菜逼

*由于Kernel需要先刷内核，但是我找到的内核文件并没有单独的boot.img文件，fastboot没法直接刷入，于是使用Kernel Flasher，而Kernel Flasher需要root,使用Magisk先行root。*

## Magisk Root

#### 修改init_boot.img

首先下载[Magisk](https://github.com/topjohnwu/Magisk),先安装在手机上，然后到[谷歌官网](https://developers.google.com/android/images?hl=zh-cn#cheetah)上下载手机对应版本的出场映像，我这里下载了16.0.0（BP4A.251205.006，2025 年 12 月）。

将下载下来的文件解压缩，找到解压后的文件夹里面还有个压缩文件夹进行解压，然后找到init_boot.img（最好把boot.img也保存一下，之后用Kernel Flasher刷的时候可以救砖）把文件传到手机上

打开手机上Magisk点击安装，选择刚刚传上来的init_boot.mig,在download目录下得到修改后的init_boot.img（我文件名叫magisk_patched-30600_B57KR.img），把这个修改后的文件传回电脑

#### 解锁Bootloader

打开Pixel的**设置**-**关于本机**-**Build号**然后连续点击七八次进入开发者模式，在**系统**-**开发者选项**打开开发者模式并且打开下面选项的解锁 Bootloader和 OEM 解锁开关。

接下来我们去下载[SDK工具](https://developer.android.com/tools/releases/platform-tools?hl=zh-cn)，解压后在终端打开对应路径输入

```
./adb version
```

验证adb是否能够成功启动

然后把电脑连上Pixel,允许来自电脑的usb调试，将手机重启到BL界限

```
./adb reboot bootloader
```

再验证是否能正常连接手机

```
./fastboot devices
```

然后打开bootloader

```
./fastboot flashing unlock
```

使用音量键选择到**Unlock the bootloader**，按电源键确认。(解锁BL手机会自动格式化，记得备份)

#### Root

然后把magisk_patched-30600_B57KR.img放到SDK工具目录（platform-tools）下，刷入修改后的内核

```
./fastboot flash init_boot 修补后的镜像文件名
```

然后重启手机

```
./fastboot reboot
```

重启后打开Magisk,这时候可能会对系统进行修复选项，确认后自动重启一次我们便得到了Magisk root

## Kernel Root

#### 刷入内核

我们先下载[Kernel Flasher](https://github.com/fatalcoder524/KernelFlasher/),再用Magisk给予root权限，打开Kernel Flasher，设备选项下查看**内核版本号**和插槽后缀，然后我们去下载[内核](https://github.com/WildKernels/GKI_KernelSU_SUSFS/releases)，一定要下载对应内核版本号！！！

把下载文件传入手机，打开Kernel Flashe，插槽后缀是什么就选择哪个插槽（a or b），查看-刷入-刷入AK3压缩包，然后一定不要先重启，去下载Kernel，我这里使用的是[KernelSU Next](https://github.com/KernelSU-Next/KernelSU-Next)，先安装到手机上。

#### 卸载Magisk

由于Magisk会和Kernel产生莫名其妙的冲突，我们要先卸载Magisk,依旧是SDK工具,先进入BL界面

```
./adb reboot bootloader
```

使用没有被修改的init_boot.img文件刷写进行复原

```
./fastboot flash init_boot init_boot.img
```

重启手机

```
./fastboot reboot
```

要是重启后能进入手机基本上算成功了，打开Kernel，显示工作中即root成功

#### SUS与Tricky

先下载[SUSFS](https://github.com/sidex15/susfs4ksu-module)，与[Tricky Store](https://github.com/5ec1cff/TrickyStore)还有[Tricky Addon](https://github.com/KOWX712/Tricky-Addon-Update-Target-List)

下载后在Kernel里面点击模块，安装SUS与Tricky，重启手机，Tricky Addon直接安装apk文件，然后在模块里面点击Tricky,有一个打开，设置哈希值，找一个读密钥的，比如Key Attestation,复制root hash放进去，遇到想隐藏的软件在列表选择就能对软件隐藏root了

这样就实现了对Pixel 7 pro的隐藏root了
