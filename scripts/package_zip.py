#!/usr/bin/env python3
"""
package_zip.py
Creates the deliverable ZIP archive: shared-self-attendance-tracker.zip
Excludes node_modules, build artifacts, temporary logs, and local databases.
"""
import os
import zipfile
import sys

def package_project():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    zip_filename = os.path.join(root_dir, 'shared-self-attendance-tracker.zip')

    # Exclusions
    EXCLUDE_DIRS = {
        'node_modules',
        'dist',
        'build',
        '.git',
        '.system_generated',
        'coverage',
        'logs'
    }

    EXCLUDE_EXTS = {
        '.log',
        '.db-journal',
        '.db-wal',
        '.db-shm'
    }

    EXCLUDE_FILES = {
        'shared-self-attendance-tracker.zip',
        '.DS_Store',
        'Thumbs.db'
    }

    print(f"📦 Packaging project from: {root_dir}")
    print(f"🎯 Target archive: {zip_filename}\n")

    file_count = 0
    total_uncompressed = 0

    with zipfile.ZipFile(zip_filename, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for foldername, subfolders, filenames in os.walk(root_dir):
            # Prune excluded directories
            subfolders[:] = [d for d in subfolders if d not in EXCLUDE_DIRS and not d.startswith('.')]

            for filename in filenames:
                if filename in EXCLUDE_FILES:
                    continue
                ext = os.path.splitext(filename)[1].lower()
                if ext in EXCLUDE_EXTS:
                    continue
                # Do not package real attendance database if generated locally
                if filename.endswith('.db') and 'data' in foldername:
                    continue

                full_path = os.path.join(foldername, filename)
                rel_path = os.path.relpath(full_path, root_dir)

                # Ensure consistent forward slash in zip archive
                archive_name = os.path.join('shared-self-attendance-tracker', rel_path).replace('\\', '/')

                file_size = os.path.getsize(full_path)
                zipf.write(full_path, archive_name)
                file_count += 1
                total_uncompressed += file_size

    archive_size = os.path.getsize(zip_filename)
    print("=" * 60)
    print(f"✅ Archive successfully generated: {zip_filename}")
    print(f"📁 Total files packaged: {file_count}")
    print(f"💾 Uncompressed size: {total_uncompressed / 1024:.1f} KB")
    print(f"🗜️  Compressed ZIP size: {archive_size / 1024:.1f} KB")
    print("=" * 60)

    # Verification: check readability of zip
    with zipfile.ZipFile(zip_filename, 'r') as verify_zip:
        bad_file = verify_zip.testzip()
        if bad_file:
            print(f"❌ ZIP verification failed on file: {bad_file}")
            sys.exit(1)
        else:
            print("✨ ZIP archive integrity verification: PASSED (all CRC checks valid)")

if __name__ == '__main__':
    package_project()
