#!/usr/bin/env sh

#
# Copyright 2015 the original author or authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

#
# @author Paul Merlin
# @author Vladimir Tsanev
#

# Resolve links: $0 may be a link
PRG="$0"
# Need this for relative symlinks.
while [ -h "$PRG" ] ; do
    ls=`ls -ld "$PRG"`
    link=`expr "$ls" : ".*-> \(.*\)"`
    if expr "$link" : ".*/.*" > /dev/null; then
        PRG="$link"
    else
        PRG=`dirname "$PRG"`"/$link"
    fi
done
SAVED="`pwd`"
cd "`dirname \"$PRG\"`"
APP_HOME="`pwd -P`"
cd "$SAVED"

# Add default JVM options here. You can also use JAVA_OPTS and GRADLE_OPTS to pass JVM options to this script.
DEFAULT_JVM_OPTS=

APP_NAME="Gradle"
APP_BASE_NAME=`basename "$0"`

# Use the maximum available, or set MAX_FD != -1 to use that value.
MAX_FD="maximum"

warn () {
    echo "$*"
}

die () {
    echo
    echo "$*"
    echo
    exit 1
}

# OS specific support (must be 'true' or 'false').
cygwin=false
darwin=false
linux=false
freebsd=false
case "`uname`" in
    CYGWIN*)
        cygwin=true
        ;;
    Darwin*)
        darwin=true
        ;;
    FreeBSD*)
        freebsd=true
        ;;
    Linux*)
        linux=true
        ;;
esac

# Attempt to set APP_HOME
# Resolve links: $0 may be a link
PRG=$0
# Need this for relative symlinks.
while [ -h "$PRG" ] ; do
    ls=`ls -ld "$PRG"`
    link=`expr "$ls" : ".*-> \(.*\)"`
    if expr "$link" : ".*/.*" > /dev/null; then
        PRG="$link"
    else
        PRG=`dirname "$PRG"`"/$link"
    fi
done
SAVED="`pwd`"
cd "`dirname \"$PRG\"`" >/dev/null
APP_HOME="`pwd -P`"
cd "$SAVED" >/dev/null

CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar


# Determine the Java command to use to start the JVM.
if [ -n "$JAVA_HOME" ] ; then
    if [ -x "$JAVA_HOME/jre/sh/java" ] ; then
        # IBM's JDK on AIX uses strange locations for the executables
        JAVACMD="$JAVA_HOME/jre/sh/java"
    else
        JAVACMD="$JAVA_HOME/bin/java"
    fi
    if [ ! -x "$JAVACMD" ] ; then
        die "ERROR: JAVA_HOME is set to an invalid directory: $JAVA_HOME

Please set the JAVA_HOME variable in your environment to match the
location of your Java installation."
    fi
else
    JAVACMD="java"
    which java >/dev/null 2>&1 || die "ERROR: JAVA_HOME is not set and no \'java\' command could be found in your PATH.

Please set the JAVA_HOME variable in your environment to match the
location of your Java installation."
fi

# Increase the maximum file descriptors if we can.
if [ "$cygwin" = "false" -a "$darwin" = "false" ] ; then
    MAX_FD_LIMIT=`ulimit -H -n`
    if [ $? -eq 0 ] ; then
        if [ "$MAX_FD" = "maximum" -o "$MAX_FD" = "max" ] ; then
            # use the system max
            MAX_FD="$MAX_FD_LIMIT"
        fi
        ulimit -n $MAX_FD
        if [ $? -ne 0 ] ; then
            warn "Could not set maximum file descriptor limit: $MAX_FD"
        fi
    else
        warn "Could not query maximum file descriptor limit: $MAX_FD_LIMIT"
    fi
fi

# For Darwin, add options to specify how the application appears in the dock
# if $darwin; then
#     GRADLE_OPTS="$GRADLE_OPTS \"-Xdock:name=$APP_NAME\" \"-Xdock:icon=$APP_HOME/media/gradle.icns\""
# fi

# For Cygwin, switch paths to Windows format before running java
if $cygwin ; then
    APP_HOME=`cygpath --path --mixed "$APP_HOME"`
    CLASSPATH=`cygpath --path --mixed "$CLASSPATH"`
    JAVACMD=`cygpath --unix "$JAVACMD"`

    # We build the pattern for arguments to be converted to Windows paths
    ROOTDIRSRAW=`find -L / -maxdepth 1 -mindepth 1 -type d 2>/dev/null`
    SEP=""
    for dir in $ROOTDIRSRAW ; do
        ROOTDIRS="$ROOTDIRS$SEP$dir"
        SEP="|"
    done
    OURCYGPATTERN="(^($ROOTDIRS))"
    # Add a user-defined pattern to the conversion list.
    if [ "$GRADLE_CYGPATTERN" != "" ] ; then
        OURCYGPATTERN="$OURCYGPATTERN|($GRADLE_CYGPATTERN)"
    fi
    # Add the drive prefix patterns then assignment patterns
    POSIX_SPACER="[[:space:]]"
    POSIX_ASSIGNMENT="=\"$POSIX_SPACER?"
    WINDOWS_DRIVES="([a-zA-Z]:)"
    WINDOWS_PATHS="($WINDOWS_DRIVES(/([[:graph:]]|.)*)?)"
    OURCYGPATTERN="$OURCYGPATTERN|($WINDOWS_PATHS)|([[:graph:]]+$POSIX_ASSIGNMENT$WINDOWS_PATHS)"
    # Avoid converting Java properties
    IGNORECYGPATTERN="(^\"-D|.+=\"-D)"

    CONVERT_REQUIRED=false

    # Collect all arguments in a single variable.
    ALL_ARGS=$*
    # Escape the quotes
    ALL_ARGS=${ALL_ARGS//\"/\\\"}
    # Escape the spaces
    ALL_ARGS=${ALL_ARGS// /\\ }

    # Check if conversion is required at all.
    if [[ "$ALL_ARGS" =~ $OURCYGPATTERN ]] ; then
        CONVERT_REQUIRED=true
    fi

    if [ "$CONVERT_REQUIRED" = "true" ] ; then
        ARGS=""
        SEP=""
        for arg in "$@" ; do
            # Skip if the argument is already quoted.
            if [[ "$arg" =~ ^\".*\"$ ]] ; then
                ARGS="$ARGS$SEP$arg"
                SEP=" "
                continue
            fi
            # Convert argument to Windows path if it matches the pattern and is not matching the ignore pattern.
            if [[ "$arg" =~ $OURCYGPATTERN ]] && [[ ! "$arg" =~ $IGNORECYGPATTERN ]] ; then
                WINDOWS_PATH=`cygpath --path --mixed "$arg"`
                ARGS="$ARGS$SEP\"$WINDOWS_PATH\""
                SEP=" "
            else
                ARGS="$ARGS$SEP$arg"
                SEP=" "
            fi
        done
    else
        # No conversion required.
        ARGS=$*
    fi
else
    # No conversion required.
    ARGS=$*
fi

# Split up the JVM_OPTS And GRADLE_OPTS values into an array, following the shell quoting and substitution rules
function splitJvmOpts() {
    JVM_OPTS=() GRADLE_OPTS=() CURRENT_OPTS=()
    for opt in $1; do
        CURRENT_OPTS+=("$opt")
    done
}

splitJvmOpts "$DEFAULT_JVM_OPTS $JAVA_OPTS $GRADLE_OPTS"
CURRENT_OPTS+=("-Dorg.gradle.appname=$APP_BASE_NAME")

exec "$JAVACMD" "${CURRENT_OPTS[@]}" -classpath "$CLASSPATH" org.gradle.wrapper.GradleWrapperMain "$ARGS"

