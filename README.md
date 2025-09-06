# _Sample project_

(See the README.md file in the upper level 'examples' directory for more information about examples.)

This is the simplest buildable example. The example is used by command `idf.py create-project`
that copies the project to user specified path and set it's name. For more information follow the [docs page](https://docs.espressif.com/projects/esp-idf/en/latest/api-guides/build-system.html#start-a-new-project)



## How to use example
We encourage the users to use the example as a template for the new projects.
A recommended way is to follow the instructions on a [docs page](https://docs.espressif.com/projects/esp-idf/en/latest/api-guides/build-system.html#start-a-new-project).

## Example folder contents

The project **sample_project** contains one source file in C language [main.c](main/main.c). The file is located in folder [main](main).

ESP-IDF projects are built using CMake. The project build configuration is contained in `CMakeLists.txt`
files that provide set of directives and instructions describing the project's source files and targets
(executable, library, or both). 

Below is short explanation of remaining files in the project folder.

```
├── CMakeLists.txt
├── main
│   ├── CMakeLists.txt
│   └── main.c
└── README.md                  This is the file you are currently reading
```
Additionally, the sample project contains Makefile and component.mk files, used for the legacy Make based build system. 
They are not used or needed when building with CMake and idf.py.

Create settings.json file with this format (Replace XXX with your path e.g. ljung)
settings.json to copy into .vscode file:
```
{
  "C_Cpp.intelliSenseEngine": "default",
  "idf.espIdfPathWin": "C:\\Users\\XXX\\esp\\v5.5.1\\esp-idf",
  "idf.pythonInstallPath": "C:\\Users\\XXX\\.espressif\\tools\\idf-python\\3.11.2\\python.exe",
  "idf.openOcdConfigs": [
    "board/esp32-wrover-kit-3.3v.cfg"
  ],
  "idf.portWin": "COM3",
  "idf.toolsPathWin": "C:\\Users\\XXX\\.espressif",
  "idf.customExtraVars": {
    "IDF_TARGET": "esp32"
  },
  "clangd.path": "C:\\Users\\XXX\\.espressif\\tools\\esp-clang\\esp-19.1.2_20250312\\esp-clang\\bin\\clangd.exe",
  "clangd.arguments": [
    "--background-index",
    "--query-driver=C:\\Users\\XXX\\.espressif\\tools\\xtensa-esp-elf\\esp-14.2.0_20241119\\xtensa-esp-elf\\bin\\xtensa-esp32-elf-gcc.exe",
    "--compile-commands-dir=${workspaceFolder}\\build"
  ],
  "idf.flashType": "UART"
}
```