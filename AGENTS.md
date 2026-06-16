# AGENTS.md

## Project Location

- Project name: 乖乖吃饭
- Project type: WeChat Mini Program
- Runtime directory: `/Users/mima1234/Desktop/codex开发/开发项目/乖乖吃饭`
- Code directory: `/Users/mima1234/Desktop/codex开发/开发项目/乖乖吃饭`

When working on this project, use the runtime/code directory above as the primary working directory.

Current recovery note: the Mini Program source has been rebuilt in this directory on the new device. WeChat DevTools has imported it with AppID `wxd23e3a3fbd980d36`; continue development from this directory unless the user explicitly points to another source tree.

## Platform

This project is a WeChat Mini Program that uses WeChat Cloud Development.

## Cloud Resources

All application resources are stored in Tencent Cloud CloudBase file storage through WeChat Cloud Development.
Public playback URLs should use the CloudBase storage custom domain `https://sg.gouqii.com`.

When adding or changing resources:

- Treat CloudBase file storage as the source of truth for uploaded assets.
- Avoid introducing local-only resource dependencies for videos, posters, or dialogue audio.
- Prefer the established public storage domain over temporary cloud file URLs for playback assets.
- Keep cloud function changes inside the Mini Program project directory unless a different location is explicitly specified.

## Development Notes

- 项目 owner 不懂开发；初始化、配置、目录对齐、文档和代码不一致、素材连接、常规排错等与开发目标无关的杂事，尽量主动替 owner 处理好，不要把这些事情推回给 owner。
- Use WeChat Mini Program conventions for pages, components, app configuration, and cloud functions.
- Preserve existing project structure and naming unless the requested change requires otherwise.
- Before editing, inspect the relevant files under the configured code directory.
- Do not move generated or uploaded resources out of Tencent Cloud CloudBase file storage without confirmation.
