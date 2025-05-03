import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import {
    uploadFiles,
    listFiles,
    deleteFile,
    RepoDesignation,
} from '@huggingface/hub'

interface UploadFile {
    path: string
    content: Blob
}

const DEFAULT_EXCEPTION_LIST = ['.gitattributes', 'README.md']

async function listRemoteFiles(
    repo: RepoDesignation,
    accessToken: string
): Promise<string[]> {
    const remoteFiles: string[] = []
    for await (const file of listFiles({
        repo,
        recursive: true,
        accessToken,
    })) {
        if (file.type === 'file') {
            remoteFiles.push(file.path)
        }
    }
    return remoteFiles
}

async function run(): Promise<void> {
    try {
        const directory = path.resolve(core.getInput('directory'))
        const repoId = core.getInput('repo_id')
        const hfToken = core.getInput('hf_token')
        const exceptionListInput = core.getInput('exception_list')
        const EXCEPTION_LIST = exceptionListInput
            ? exceptionListInput
                  .split(',')
                  .map((s) => s.trim())
                  .filter((s) => s)
            : DEFAULT_EXCEPTION_LIST

        core.info(`Exception list: ${EXCEPTION_LIST.join(', ')}`)

        if (!fs.existsSync(directory)) {
            throw new Error(`Directory ${directory} does not exist.`)
        }

        const localFiles: UploadFile[] = []
        const localFilePaths: Set<string> = new Set()
        const collectFiles = (dir: string) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true })
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name)
                if (entry.isFile()) {
                    const relativePath = path
                        .relative(directory, fullPath)
                        .replace(/\\/g, '/')
                    localFilePaths.add(relativePath)
                    const content = fs.readFileSync(fullPath)
                    const blob = new Blob([content])
                    localFiles.push({
                        path: relativePath,
                        content: blob,
                    })
                } else if (entry.isDirectory()) {
                    collectFiles(fullPath)
                }
            }
        }

        collectFiles(directory)

        if (localFiles.length === 0) {
            throw new Error(`No files found in directory ${directory}.`)
        }

        const repo: RepoDesignation = { type: 'space', name: repoId }
        core.info(`Listing files in remote repository ${repoId}...`)
        const remoteFilePaths = await listRemoteFiles(repo, hfToken)
        core.info(`Found ${remoteFilePaths.length} files in remote repository.`)

        const filesToDelete = remoteFilePaths.filter(
            (path) =>
                !localFilePaths.has(path) && !EXCEPTION_LIST.includes(path)
        )
        core.info(
            `Found ${filesToDelete.length} files to delete in remote repository.`
        )

        for (const filePath of filesToDelete) {
            core.info(`Deleting remote file: ${filePath}`)
            await deleteFile({
                repo,
                path: filePath,
                accessToken: hfToken,
            })
        }

        core.info(
            `Uploading ${localFiles.length} files from ${directory} to repository ${repoId}...`
        )
        await uploadFiles({
            repo,
            accessToken: hfToken,
            files: localFiles,
        })

        core.info('Synchronization successful!')
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(`Action failed with error: ${error.message}`)
        } else {
            core.setFailed('Action failed with an unknown error.')
        }
    }
}

run()
