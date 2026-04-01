#!/bin/bash
# ============================================================
# 🚀 FULL APP DEV ENVIRONMENT SETUP
# Installs: Git, Java 17, Flutter SDK, Android Command Line Tools
# ============================================================
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()    { echo -e "${GREEN}✅ [INFO]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠️  [WARN]${NC} $1"; }
log_error()   { echo -e "${RED}❌ [ERROR]${NC} $1"; }
log_step()    { echo -e "\n${BLUE}════════════════════════════════════════${NC}"; echo -e "${CYAN}🔧 $1${NC}"; echo -e "${BLUE}════════════════════════════════════════${NC}"; }

# ---- Detect Shell Profile ----
detect_shell_profile() {
  if [ -n "${ZSH_VERSION:-}" ] || [ "$SHELL" = "/bin/zsh" ] || [ "$SHELL" = "/usr/bin/zsh" ]; then
    echo "$HOME/.zshrc"
  else
    echo "$HOME/.bashrc"
  fi
}

SHELL_PROFILE=$(detect_shell_profile)
log_info "Shell profile detectado: $SHELL_PROFILE"

add_to_path() {
  local line="$1"
  if ! grep -qF "$line" "$SHELL_PROFILE" 2>/dev/null; then
    echo "$line" >> "$SHELL_PROFILE"
    log_info "Adicionado ao $SHELL_PROFILE: $line"
  else
    log_warn "Linha já existe no perfil: $line"
  fi
}

# -------------------------------------------------------
# 1. DETECT OS & PACKAGE MANAGER
# -------------------------------------------------------
log_step "1/7 - Detectando sistema operacional"

if command -v apt-get &>/dev/null; then
  PKG_MANAGER="apt"
  log_info "Gerenciador de pacotes: apt (Debian/Ubuntu)"
elif command -v dnf &>/dev/null; then
  PKG_MANAGER="dnf"
  log_info "Gerenciador de pacotes: dnf (Fedora/RHEL)"
elif command -v pacman &>/dev/null; then
  PKG_MANAGER="pacman"
  log_info "Gerenciador de pacotes: pacman (Arch)"
else
  log_error "Gerenciador de pacotes não suportado. Instale manualmente."
  exit 1
fi

# -------------------------------------------------------
# 2. INSTALL GIT
# -------------------------------------------------------
log_step "2/7 - Instalando Git"

if command -v git &>/dev/null; then
  log_warn "Git já está instalado: $(git --version)"
else
  if [ "$PKG_MANAGER" = "apt" ]; then
    sudo apt-get update -y
    sudo apt-get install -y git
  elif [ "$PKG_MANAGER" = "dnf" ]; then
    sudo dnf install -y git
  elif [ "$PKG_MANAGER" = "pacman" ]; then
    sudo pacman -S --noconfirm git
  fi
  log_info "Git instalado: $(git --version)"
fi

# -------------------------------------------------------
# 3. INSTALL JAVA 17
# -------------------------------------------------------
log_step "3/7 - Instalando Java OpenJDK 17 ou 21"

if java -version 2>&1 | grep -q "openjdk 17\|openjdk version \"17\|openjdk 21\|openjdk version \"21"; then
  log_warn "Java 17 ou 21 já está instalado."
else
  if [ "$PKG_MANAGER" = "apt" ]; then
    sudo apt-get install -y openjdk-17-jdk || sudo apt-get install -y openjdk-21-jdk
  elif [ "$PKG_MANAGER" = "dnf" ]; then
    log_info "Tentando instalar Java via dnf (tentando várias versões)..."
    sudo dnf install -y java-17-openjdk-devel || \
    sudo dnf install -y java-21-openjdk-devel || \
    sudo dnf install -y java-11-openjdk-devel || \
    sudo dnf install -y java-latest-openjdk-devel || \
    sudo dnf install -y openjdk-17-devel
  elif [ "$PKG_MANAGER" = "pacman" ]; then
    sudo pacman -S --noconfirm jdk17-openjdk || sudo pacman -S --noconfirm jdk-openjdk
    sudo archlinux-java set java-17-openjdk || sudo archlinux-java set java-21-openjdk || true
  fi
fi

java -version
JAVA_HOME_PATH=$(java -XshowSettings:all -version 2>&1 | grep "java.home" | awk '{print $3}' | head -1)
export JAVA_HOME="${JAVA_HOME_PATH:-/usr/lib/jvm/java-17-openjdk-amd64}"
add_to_path "export JAVA_HOME=\"$JAVA_HOME\""
add_to_path 'export PATH="$JAVA_HOME/bin:$PATH"'
log_info "JAVA_HOME definido como: $JAVA_HOME"

# -------------------------------------------------------
# 4. INSTALL ADDITIONAL DEPENDENCIES
# -------------------------------------------------------
log_step "4/7 - Instalando dependências adicionais (curl, wget, unzip, etc.)"

if [ "$PKG_MANAGER" = "apt" ]; then
  sudo apt-get install -y curl wget unzip xz-utils libglu1-mesa clang cmake ninja-build libgtk-3-dev
elif [ "$PKG_MANAGER" = "dnf" ]; then
  sudo dnf install -y curl wget unzip xz mesa-libGLU clang cmake ninja-build gtk3-devel
elif [ "$PKG_MANAGER" = "pacman" ]; then
  sudo pacman -S --noconfirm curl wget unzip xz glu clang cmake ninja gtk3
fi
log_info "Dependências instaladas."

# -------------------------------------------------------
# 5. INSTALL NODE.JS (LTS via nvm)
# -------------------------------------------------------
log_step "5/7 - Instalando Node.js LTS via nvm"

if command -v node &>/dev/null; then
  log_warn "Node.js já instalado: $(node -v)"
else
  log_info "Instalando nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

  # Source nvm para usar neste script
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

  nvm install --lts
  nvm use --lts
  log_info "Node.js instalado: $(node -v)"
fi

# -------------------------------------------------------
# 6. INSTALL FLUTTER SDK
# -------------------------------------------------------
log_step "6/7 - Instalando Flutter SDK"

FLUTTER_DIR="$HOME/development"
FLUTTER_PATH="$FLUTTER_DIR/flutter"

mkdir -p "$FLUTTER_DIR"

if [ -d "$FLUTTER_PATH/bin" ]; then
  log_warn "Flutter já está instalado em $FLUTTER_PATH"
  log_info "Atualizando Flutter..."
  "$FLUTTER_PATH/bin/flutter" upgrade
else
  log_info "Baixando Flutter SDK (stable)..."
  ARCH=$(uname -m)
  if [ "$ARCH" = "x86_64" ]; then
    FLUTTER_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.27.4-stable.tar.xz"
  else
    log_error "Arquitetura $ARCH não suportada diretamente. Verifique o site do Flutter."
    FLUTTER_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.27.4-stable.tar.xz"
  fi

  wget -c "$FLUTTER_URL" -O /tmp/flutter.tar.xz
  log_info "Extraindo Flutter..."
  tar -xf /tmp/flutter.tar.xz -C "$FLUTTER_DIR"
  rm /tmp/flutter.tar.xz
  log_info "Flutter extraído em $FLUTTER_PATH"
fi

add_to_path "export PATH=\"\$PATH:$FLUTTER_PATH/bin\""
export PATH="$PATH:$FLUTTER_PATH/bin"

# Disable analytics
"$FLUTTER_PATH/bin/flutter" config --no-analytics
log_info "Flutter analytics desativado."

# -------------------------------------------------------
# 7. INSTALL ANDROID COMMAND LINE TOOLS
# -------------------------------------------------------
log_step "7/7 - Instalando Android Command Line Tools"

ANDROID_SDK_ROOT="$HOME/Android/Sdk"
CMDLINE_TOOLS_DIR="$ANDROID_SDK_ROOT/cmdline-tools/latest"

mkdir -p "$CMDLINE_TOOLS_DIR"

if [ -f "$CMDLINE_TOOLS_DIR/bin/sdkmanager" ]; then
  log_warn "Android Command Line Tools já instalado."
else
  CMDLINE_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
  log_info "Baixando Android Command Line Tools..."
  wget -c "$CMDLINE_URL" -O /tmp/cmdline-tools.zip
  log_info "Extraindo..."
  unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools-extract
  mv /tmp/cmdline-tools-extract/cmdline-tools/* "$CMDLINE_TOOLS_DIR/"
  rm -rf /tmp/cmdline-tools.zip /tmp/cmdline-tools-extract
  log_info "Android Command Line Tools instalado."
fi

add_to_path "export ANDROID_SDK_ROOT=\"$ANDROID_SDK_ROOT\""
add_to_path "export ANDROID_HOME=\"$ANDROID_SDK_ROOT\""
add_to_path "export PATH=\"\$PATH:\$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:\$ANDROID_SDK_ROOT/platform-tools:\$ANDROID_SDK_ROOT/emulator\""

export ANDROID_SDK_ROOT
export ANDROID_HOME="$ANDROID_SDK_ROOT"
export PATH="$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator"

log_info "Aceitando licenças Android SDK..."
yes | "$CMDLINE_TOOLS_DIR/bin/sdkmanager" --licenses > /dev/null 2>&1 || true

log_info "Instalando platform-tools, build-tools e SDK..."
"$CMDLINE_TOOLS_DIR/bin/sdkmanager" \
  "platform-tools" \
  "build-tools;35.0.0" \
  "platforms;android-35" \
  "emulator" \
  "system-images;android-35;google_apis;x86_64"

log_info "Android SDK instalado."

# -------------------------------------------------------
# FINAL VERIFICATION
# -------------------------------------------------------
echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      🎉 SETUP COMPLETE - RELATÓRIO     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Git:${NC}     $(git --version 2>/dev/null || echo 'FALHOU')"
echo -e "${GREEN}Java:${NC}    $(java -version 2>&1 | head -1 || echo 'FALHOU')"
echo -e "${GREEN}Node:${NC}    $(node -v 2>/dev/null || echo 'não instalado ainda - reinicie o terminal')"
echo -e "${GREEN}Flutter:${NC} $($FLUTTER_PATH/bin/flutter --version 2>/dev/null | head -1 || echo 'FALHOU')"
echo -e "${GREEN}adb:${NC}     $(adb --version 2>/dev/null | head -1 || echo 'reinicie o terminal')"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}IMPORTANTE: Recarregue seu terminal:${NC}"
echo -e "    ${CYAN}source $SHELL_PROFILE${NC}"
echo -e "${YELLOW}Depois rode:${NC}"
echo -e "    ${CYAN}flutter doctor${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
