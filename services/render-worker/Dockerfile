# VS-010B isolated render worker. Python 3.12 keeps the audioop stdlib module
# that pydub (a manim-voiceover dependency) imports; 3.13+ removed it.
# Pin the index digest so rebuilds skip Docker Hub tag lookup.
FROM python:3.12-slim@sha256:e5c9fa26ffb76e11e0f054f30dc2523a2f9693f0c36c0cf1e39b27e152d899fc AS builder

# HTTP to deb.debian.org EOFs through Clash TUN fake-ip; HTTPS does not.
# Skip trixie-updates (flaky through the same path). Main + security is enough.
RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g; s/ trixie-updates//' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        pkg-config \
        libcairo2-dev \
        libpango1.0-dev \
        libffi-dev \
        libegl-dev \
    && rm -rf /var/lib/apt/lists/*

ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
WORKDIR /build
COPY requirements.txt .
RUN pip install --timeout 120 --retries 5 --no-cache-dir -r requirements.txt

FROM python:3.12-slim@sha256:e5c9fa26ffb76e11e0f054f30dc2523a2f9693f0c36c0cf1e39b27e152d899fc

RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g; s/ trixie-updates//' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        sox \
        dvisvgm \
        ghostscript \
        cm-super \
        texlive-latex-base \
        texlive-latex-recommended \
        texlive-latex-extra \
        texlive-fonts-recommended \
        texlive-science \
        libcairo2 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libpangoft2-1.0-0 \
        libglib2.0-0 \
        libffi8 \
        libegl1 \
        libgl1 \
        fonts-dejavu-core \
        fonts-noto-core \
        fonts-noto-cjk \
        fontconfig \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f

ENV VIRTUAL_ENV=/opt/venv
COPY --from=builder "$VIRTUAL_ENV" "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /app
COPY yukcsca_worker ./yukcsca_worker

# nobody cannot write $HOME; TeX and Manim cache into /tmp.
ENV PYTHONUNBUFFERED=1 \
    HOME=/tmp \
    TEXMFVAR=/tmp/texmf-var \
    TEXMFCONFIG=/tmp/texmf-config \
    MANIM_CONFIG=/tmp/manim
USER nobody

CMD ["python", "-m", "yukcsca_worker.worker"]
